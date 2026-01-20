/**
 * useAttachments Hook
 * Manages file attachment upload lifecycle and state
 */

import { useState, useCallback, useRef } from 'react';
import { attachmentsApi } from '@/lib/api/attachments';
import type {
  PendingAttachment,
  UploadProgress,
} from '@/types/attachment';
import {
  ATTACHMENT_LIMITS,
  ATTACHMENT_ERROR_MESSAGES,
} from '@/types/attachment';

export interface UseAttachmentsResult {
  /** List of pending attachments with their current status */
  pendingAttachments: PendingAttachment[];
  /** Whether any attachment is currently uploading */
  isUploading: boolean;
  /** Whether any attachment is currently processing */
  isProcessing: boolean;
  /** Overall upload progress (0-100) */
  uploadProgress: number;
  /** Add files to the pending list */
  addFiles: (files: File[]) => void;
  /** Remove a file from the pending list */
  removeFile: (id: string) => void;
  /** Clear all pending attachments */
  clearAll: () => void;
  /** Upload all pending files and wait for processing. Returns array of server attachment IDs */
  uploadAndProcess: (conversationId?: string) => Promise<string[]>;
  /** Retry a failed attachment */
  retryFile: (id: string, conversationId?: string) => Promise<void>;
  /** Get validation error for a file, or null if valid */
  getValidationError: (file: File) => string | null;
  /** Check if a file type is allowed */
  isAllowedFile: (file: File) => boolean;
  /** Check if we can add more files */
  canAddMoreFiles: boolean;
}

/**
 * Generate a unique local ID for pending attachments
 */
function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if file is an image type
 */
function isImageFile(file: File): boolean {
  return (ATTACHMENT_LIMITS.allowedImageTypes as readonly string[]).includes(file.type);
}

/**
 * Check if file is a document type
 */
function isDocumentFile(file: File): boolean {
  return (ATTACHMENT_LIMITS.allowedDocumentTypes as readonly string[]).includes(file.type);
}

/**
 * Create image preview data URL
 */
function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useAttachments(): UseAttachmentsResult {
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Check if a file type is allowed
   */
  const isAllowedFile = useCallback((file: File): boolean => {
    return isImageFile(file) || isDocumentFile(file);
  }, []);

  /**
   * Get validation error for a file
   */
  const getValidationError = useCallback((file: File): string | null => {
    const isImage = isImageFile(file);
    const isDocument = isDocumentFile(file);

    if (!isImage && !isDocument) {
      return ATTACHMENT_ERROR_MESSAGES.invalidType;
    }

    if (isImage && file.size > ATTACHMENT_LIMITS.maxImageSize) {
      return ATTACHMENT_ERROR_MESSAGES.fileTooLargeImage;
    }

    if (isDocument && file.size > ATTACHMENT_LIMITS.maxDocumentSize) {
      return ATTACHMENT_ERROR_MESSAGES.fileTooLargeDocument;
    }

    return null;
  }, []);

  /**
   * Check if we can add more files
   */
  const canAddMoreFiles = pendingAttachments.length < ATTACHMENT_LIMITS.maxAttachmentsPerMessage;

  /**
   * Add files to pending list
   */
  const addFiles = useCallback(async (files: File[]) => {
    const currentCount = pendingAttachments.length;
    const remainingSlots = ATTACHMENT_LIMITS.maxAttachmentsPerMessage - currentCount;

    if (remainingSlots <= 0) {
      console.warn(ATTACHMENT_ERROR_MESSAGES.maxAttachmentsReached);
      return;
    }

    // Filter out invalid files and limit to remaining slots
    const validFiles = files
      .slice(0, remainingSlots)
      .filter((file) => !getValidationError(file));

    // Create pending attachments with previews for images
    const newAttachments: PendingAttachment[] = await Promise.all(
      validFiles.map(async (file) => {
        const attachment: PendingAttachment = {
          id: generateLocalId(),
          file,
          status: 'pending',
          uploadProgress: 0,
        };

        // Generate preview for images
        if (isImageFile(file)) {
          try {
            attachment.preview = await createImagePreview(file);
          } catch {
            // Continue without preview if it fails
          }
        }

        return attachment;
      })
    );

    setPendingAttachments((prev) => [...prev, ...newAttachments]);
  }, [pendingAttachments.length, getValidationError]);

  /**
   * Remove a file from pending list
   */
  const removeFile = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /**
   * Clear all pending attachments
   */
  const clearAll = useCallback(() => {
    // Cancel any ongoing uploads
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setPendingAttachments([]);
  }, []);

  /**
   * Update a specific attachment's state
   */
  const updateAttachment = useCallback((id: string, updates: Partial<PendingAttachment>) => {
    setPendingAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  /**
   * Upload a single file and wait for processing
   */
  const uploadSingleFile = useCallback(
    async (attachment: PendingAttachment, conversationId?: string, signal?: AbortSignal): Promise<string> => {
      // Set to uploading
      updateAttachment(attachment.id, { status: 'uploading', uploadProgress: 0, error: undefined });

      try {
        // Upload file
        const uploaded = await attachmentsApi.upload(
          attachment.file,
          conversationId,
          (progress: UploadProgress) => {
            updateAttachment(attachment.id, { uploadProgress: progress.percentage });
          },
          signal
        );

        // Update with server ID and set to processing
        updateAttachment(attachment.id, {
          serverId: uploaded.id,
          status: 'processing',
          uploadProgress: 100,
        });

        // Wait for processing
        await attachmentsApi.waitForProcessing(uploaded.id, 60, 1000, signal);

        // Mark as processed
        updateAttachment(attachment.id, { status: 'processed' });

        return uploaded.id;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        updateAttachment(attachment.id, {
          status: 'error',
          error: errorMessage,
        });
        throw error;
      }
    },
    [updateAttachment]
  );

  /**
   * Upload all pending files and wait for processing
   * Returns array of successfully processed attachment IDs
   */
  const uploadAndProcess = useCallback(
    async (conversationId?: string): Promise<string[]> => {
      const pendingFiles = pendingAttachments.filter(
        (a) => a.status === 'pending' || a.status === 'error'
      );

      if (pendingFiles.length === 0) {
        // Return IDs of already processed attachments
        return pendingAttachments
          .filter((a) => a.status === 'processed' && a.serverId)
          .map((a) => a.serverId!);
      }

      // Create abort controller for this upload session
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      const results: string[] = [];
      const errors: Error[] = [];

      // Upload files sequentially to avoid overwhelming the server
      // and to provide clear progress feedback
      for (const attachment of pendingFiles) {
        if (signal.aborted) break;

        try {
          const serverId = await uploadSingleFile(attachment, conversationId, signal);
          results.push(serverId);
        } catch (error) {
          if (error instanceof Error && error.message.includes('cancel')) {
            break; // Stop on cancel
          }
          errors.push(error instanceof Error ? error : new Error('Erro desconhecido'));
          // Continue with other files even if one fails
        }
      }

      // Also include previously processed attachments
      const previouslyProcessed = pendingAttachments
        .filter((a) => a.status === 'processed' && a.serverId && !pendingFiles.includes(a))
        .map((a) => a.serverId!);

      results.push(...previouslyProcessed);

      // If all files failed, throw the first error
      if (results.length === 0 && errors.length > 0) {
        throw errors[0];
      }

      return results;
    },
    [pendingAttachments, uploadSingleFile]
  );

  /**
   * Retry a failed attachment
   */
  const retryFile = useCallback(
    async (id: string, conversationId?: string): Promise<void> => {
      const attachment = pendingAttachments.find((a) => a.id === id);
      if (!attachment || attachment.status !== 'error') return;

      abortControllerRef.current = new AbortController();
      await uploadSingleFile(attachment, conversationId, abortControllerRef.current.signal);
    },
    [pendingAttachments, uploadSingleFile]
  );

  // Calculate derived states
  const isUploading = pendingAttachments.some((a) => a.status === 'uploading');
  const isProcessing = pendingAttachments.some((a) => a.status === 'processing');

  const uploadProgress =
    pendingAttachments.length > 0
      ? Math.round(
          pendingAttachments.reduce((sum, a) => sum + a.uploadProgress, 0) /
            pendingAttachments.length
        )
      : 0;

  return {
    pendingAttachments,
    isUploading,
    isProcessing,
    uploadProgress,
    addFiles,
    removeFile,
    clearAll,
    uploadAndProcess,
    retryFile,
    getValidationError,
    isAllowedFile,
    canAddMoreFiles,
  };
}
