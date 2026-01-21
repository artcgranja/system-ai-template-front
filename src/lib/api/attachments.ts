/**
 * Attachments API
 * Handles file upload and processing status for chat attachments
 */

import { API_CONFIG, STORAGE_KEYS, ROUTES, COOKIE_NAME } from '@/config/constants';
import { getAccessToken, getRefreshToken } from '@/lib/utils/auth';
import type {
  Attachment,
  BackendAttachment,
  AttachmentUploadResponse,
  AttachmentStatusResponse,
  UploadProgress,
} from '@/types/attachment';
import type { BackendLoginResponse } from '@/types/auth';

/**
 * Transform backend attachment to frontend format
 */
function transformAttachment(backend: BackendAttachment): Attachment {
  return {
    id: backend.id,
    originalFilename: backend.original_filename,
    mimeType: backend.mime_type,
    fileSizeBytes: backend.file_size_bytes,
    status: backend.status,
    createdAt: new Date(backend.created_at),
    processingError: backend.processing_error,
  };
}

/**
 * Refresh token and retry failed request
 */
async function refreshTokenAndGetNew(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  try {
    const refreshResponse = await fetch(`${API_CONFIG.baseURL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!refreshResponse.ok) {
      return null;
    }

    const refreshData: BackendLoginResponse = await refreshResponse.json();
    const { access_token, refresh_token } = refreshData;

    // Update stored tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token);

      // Update cookie for Next.js middleware
      const expiryDays = 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      document.cookie = `${COOKIE_NAME}=${access_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    }

    return access_token;
  } catch {
    return null;
  }
}

/**
 * Clear auth and redirect to login
 */
function clearAuthAndRedirect(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.user);
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    window.location.href = ROUTES.login;
  }
}

/**
 * Attachments API methods
 */
export const attachmentsApi = {
  /**
   * Upload a file attachment
   * POST /api/attachments/upload
   * Uses XMLHttpRequest for progress tracking
   */
  upload: (
    file: File,
    conversationId?: string,
    onProgress?: (progress: UploadProgress) => void,
    signal?: AbortSignal
  ): Promise<Attachment> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }

      const token = getAccessToken();
      const xhr = new XMLHttpRequest();
      let retried = false;

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled'));
        });
      }

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response: AttachmentUploadResponse = JSON.parse(xhr.responseText);
            resolve(transformAttachment(response as BackendAttachment));
          } catch {
            reject(new Error('Failed to parse upload response'));
          }
        } else if (xhr.status === 401 && !retried) {
          // Try to refresh token and retry
          retried = true;
          const newToken = await refreshTokenAndGetNew();

          if (newToken) {
            // Retry with new token
            xhr.open('POST', `${API_CONFIG.baseURL}/api/attachments/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${newToken}`);
            xhr.send(formData);
          } else {
            clearAuthAndRedirect();
            reject(new Error('Sessão expirada. Por favor, faça login novamente.'));
          }
        } else if (xhr.status === 401) {
          clearAuthAndRedirect();
          reject(new Error('Sessão expirada. Por favor, faça login novamente.'));
        } else {
          let errorMessage = 'Falha no upload';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.detail || errorResponse.message || errorMessage;
          } catch {
            // Use default error message
          }
          reject(new Error(errorMessage));
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        reject(new Error('Erro de conexão durante o upload'));
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelado'));
      });

      // Open connection and send
      xhr.open('POST', `${API_CONFIG.baseURL}/api/attachments/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },

  /**
   * Get attachment processing status
   * GET /api/attachments/{id}
   */
  getStatus: async (id: string): Promise<AttachmentStatusResponse> => {
    const token = getAccessToken();

    let response = await fetch(`${API_CONFIG.baseURL}/api/attachments/${id}`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    // Handle 401 with token refresh
    if (response.status === 401) {
      const newToken = await refreshTokenAndGetNew();

      if (newToken) {
        response = await fetch(`${API_CONFIG.baseURL}/api/attachments/${id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
      } else {
        clearAuthAndRedirect();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
    }

    if (!response.ok) {
      throw new Error(`Falha ao verificar status do anexo: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Poll for attachment processing completion
   * Polls every interval until status is 'processed' or 'error'
   * @param id - Attachment ID to poll
   * @param maxAttempts - Maximum number of polling attempts (default: 60)
   * @param intervalMs - Polling interval in milliseconds (default: 1000)
   * @param signal - Optional AbortSignal to cancel polling
   */
  waitForProcessing: async (
    id: string,
    maxAttempts: number = 60,
    intervalMs: number = 1000,
    signal?: AbortSignal
  ): Promise<AttachmentStatusResponse> => {
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Check if cancelled
      if (signal?.aborted) {
        throw new Error('Verificação de processamento cancelada');
      }

      const status = await attachmentsApi.getStatus(id);

      if (status.status === 'processed') {
        return status;
      }

      if (status.status === 'error') {
        throw new Error(status.processing_error || 'Falha no processamento do arquivo');
      }

      // Wait before next poll
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(resolve, intervalMs);

        // Handle abort during wait
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            reject(new Error('Verificação de processamento cancelada'));
          }, { once: true });
        }
      });

      attempts++;
    }

    throw new Error('Tempo limite de processamento excedido. Tente novamente.');
  },
};
