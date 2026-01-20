import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG, STORAGE_KEYS, ROUTES } from '@/config/constants';
import { isTokenExpiringSoon } from '@/lib/utils/auth';
import type { ApiError, ApiResponse } from '@/types/api';
import type { BackendLoginResponse } from '@/types/auth';

// Type for API responses that can have multiple formats
type ApiResponseData<T> =
  | ApiResponse<T>  // Standard: { data: T, success: boolean }
  | { folders: T; total: number }  // Paginated folders
  | { conversations: T; total: number }  // Paginated conversations
  | { messages: T }  // Messages response
  | { items: T; total: number; page: number; page_size: number; total_pages: number }  // Paginated feedbacks
  | { message: string; deleted_id?: string; affected_conversations?: number }  // Delete responses
  | T;  // Direct response

// Token refresh state management
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  withCredentials: API_CONFIG.withCredentials,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Attempt to refresh the access token using the refresh token
 * Returns the new access token or null if refresh fails
 */
async function refreshAccessToken(): Promise<string | null> {
  // If already refreshing, return the existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Set refreshing flag and create new promise
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      if (typeof window === 'undefined') {
        return null;
      }

      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
      if (!refreshToken) {
        return null;
      }

      // Call refresh endpoint with snake_case format
      const response = await axios.post<BackendLoginResponse>(
        `${API_CONFIG.baseURL}/api/auth/refresh`,
        { refresh_token: refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: API_CONFIG.withCredentials,
        }
      );

      const { access_token, refresh_token } = response.data;

      // Update stored tokens
      localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
      localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token);

      // Update cookie for Next.js middleware
      const expiryDays = 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      document.cookie = `vora_access_token=${access_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;

      return access_token;
    } catch {
      // Refresh failed
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage (only on client side)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(STORAGE_KEYS.accessToken);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if this is an auth endpoint (login/logout) - skip token refresh for these
    const isAuthEndpoint = originalRequest?.url?.includes('/api/auth/login') || 
                          originalRequest?.url?.includes('/api/auth/logout');

    // Handle 401 Unauthorized - Attempt token refresh (skip for auth endpoints)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      // Mark request as retried to prevent infinite loops
      originalRequest._retry = true;

      // Attempt to refresh the token
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        // Refresh successful - retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } else {
        // Refresh failed - clear auth data and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.accessToken);
          localStorage.removeItem(STORAGE_KEYS.refreshToken);
          localStorage.removeItem(STORAGE_KEYS.user);

          // Remove cookie
          document.cookie = 'vora_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

          // Redirect to login
          window.location.href = ROUTES.login;
        }
      }
    }

    // Format error with improved messages
    let errorMessage = error.response?.data?.message || error.message || 'Ocorreu um erro';

    // Provide user-friendly messages for common error scenarios
    if (!error.response) {
      // Network error (no response from server)
      errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
    } else {
      // Customize messages based on status code if no specific message provided
      if (!error.response?.data?.message) {
        switch (error.response.status) {
          case 400:
            errorMessage = 'Requisição inválida. Verifique os dados enviados.';
            break;
          case 401:
            // For login endpoint, show credential error; otherwise show session expired
            if (isAuthEndpoint && originalRequest?.url?.includes('/api/auth/login')) {
              errorMessage = 'Email ou senha incorretos';
            } else {
              errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
            }
            break;
          case 403:
            errorMessage = 'Você não tem permissão para acessar este recurso.';
            break;
          case 404:
            errorMessage = 'Recurso não encontrado.';
            break;
          case 409:
            errorMessage = 'Conflito: o recurso já existe ou está em uso.';
            break;
          case 422:
            errorMessage = 'Dados inválidos. Verifique as informações fornecidas.';
            break;
          case 429:
            errorMessage = 'Muitas requisições. Por favor, aguarde um momento.';
            break;
          case 500:
            errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
            break;
          case 502:
          case 503:
            errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
            break;
          case 504:
            errorMessage = 'Tempo limite excedido. O servidor demorou muito para responder.';
            break;
        }
      } else {
        // Backend provided a message, but for login 401 errors, ensure it's user-friendly
        if (error.response.status === 401 && isAuthEndpoint && originalRequest?.url?.includes('/api/auth/login')) {
          // Use backend message if available, otherwise use default credential error
          errorMessage = error.response.data.message || 'Email ou senha incorretos';
        }
      }
    }

    const apiError: ApiError = {
      message: errorMessage,
      code: error.response?.data?.code || error.code,
      statusCode: error.response?.status || 500,
      details: error.response?.data?.details,
    };

    return Promise.reject(apiError);
  }
);

// Helper function to handle API responses
// Supports multiple response formats:
// 1. Standard ApiResponse: { data: T, success: boolean, message?: string }
// 2. Paginated folders: { folders: T[], total: number }
// 3. Paginated conversations: { conversations: T[], total: number }
// 4. Messages response: { messages: T[] }
// 5. Delete responses: { message: string, deleted_id: string, ...} → returns void
// 6. Direct response: T
export async function handleApiResponse<T>(
  request: Promise<{ data: ApiResponseData<T> }>
): Promise<T> {
  try {
    const response = await request;

    // Handle standard ApiResponse format { data: T, success: boolean }
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }

    // Handle paginated folders response { folders: T[], total: number }
    if (response.data && typeof response.data === 'object' && 'folders' in response.data) {
      return response.data.folders as T;
    }

    // Handle paginated conversations response { conversations: T[], total: number }
    if (response.data && typeof response.data === 'object' && 'conversations' in response.data) {
      return response.data.conversations as T;
    }

    // Handle messages response { messages: T[] }
    if (response.data && typeof response.data === 'object' && 'messages' in response.data) {
      return response.data.messages as T;
    }

    // Handle paginated feedbacks response { items: T[], total: number, page: number, page_size: number, total_pages: number }
    if (response.data && typeof response.data === 'object' && 'items' in response.data && 'total_pages' in response.data) {
      return response.data as T;
    }

    // Handle delete responses { message: string, deleted_id?: string }
    // These methods typically return Promise<void>, so we just return undefined as T
    if (response.data && typeof response.data === 'object' && 'message' in response.data && 'deleted_id' in response.data) {
      return undefined as T;
    }

    // Fallback: return data directly (for direct object responses or other formats)
    return response.data as T;
  } catch (error) {
    throw error as ApiError;
  }
}

/**
 * Proactively check and refresh token if it's expiring soon
 * Call this function periodically or on app initialization
 * @param minutesBeforeExpiry - Number of minutes before expiration to trigger refresh (default: 5)
 * @returns Promise<boolean> - true if token was refreshed, false otherwise
 */
export async function checkAndRefreshToken(minutesBeforeExpiry: number = 5): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const token = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (!token) return false;

  // Check if token is expiring soon
  if (isTokenExpiringSoon(token, minutesBeforeExpiry)) {
    const newToken = await refreshAccessToken();
    return !!newToken;
  }

  return false;
}

/**
 * Initialize token refresh interval to automatically refresh tokens before expiration
 * Call this once when the app starts (e.g., in a root component or layout)
 * @param checkIntervalMinutes - How often to check for token expiration (default: 1 minute)
 * @param refreshBeforeMinutes - How many minutes before expiry to refresh (default: 5 minutes)
 * @returns Cleanup function to clear the interval
 */
export function initializeTokenRefresh(
  checkIntervalMinutes: number = 1,
  refreshBeforeMinutes: number = 5
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check immediately on initialization
  checkAndRefreshToken(refreshBeforeMinutes);

  // Set up periodic check
  const intervalId = setInterval(() => {
    checkAndRefreshToken(refreshBeforeMinutes);
  }, checkIntervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

export default apiClient;
