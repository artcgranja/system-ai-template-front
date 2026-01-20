/**
 * Attachment Types
 * Type definitions for file attachment functionality
 */

// Status of an attachment throughout its lifecycle
export type AttachmentStatus = 'pending' | 'uploading' | 'processing' | 'processed' | 'error';

// Attachment data from backend (after upload)
export interface Attachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: AttachmentStatus;
  createdAt: Date;
  processingError?: string | null;
}

// Backend response format (snake_case)
export interface BackendAttachment {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: 'pending' | 'processing' | 'processed' | 'error';
  created_at: string;
  processing_error?: string | null;
}

// Upload response from POST /api/attachments/upload
export interface AttachmentUploadResponse {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: 'pending';
  created_at: string;
}

// Status response from GET /api/attachments/{id}
export interface AttachmentStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'processed' | 'error';
  processing_error?: string | null;
}

// Frontend pending attachment (before/during upload)
export interface PendingAttachment {
  id: string;              // Local ID (e.g., "local-timestamp-random")
  file: File;
  status: AttachmentStatus;
  uploadProgress: number;  // 0-100
  serverId?: string;       // Backend ID after successful upload
  error?: string;          // Error message if failed
  preview?: string;        // Data URL for image preview
}

// Upload progress event
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Validation constants
export const ATTACHMENT_LIMITS = {
  maxImageSize: 20 * 1024 * 1024,     // 20MB
  maxDocumentSize: 50 * 1024 * 1024,  // 50MB
  maxAttachmentsPerMessage: 10,
  allowedImageTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ] as const,
  allowedDocumentTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
    'application/vnd.ms-excel',                                                  // .xls
  ] as const,
} as const;

// Helper type for allowed MIME types
export type AllowedImageType = typeof ATTACHMENT_LIMITS.allowedImageTypes[number];
export type AllowedDocumentType = typeof ATTACHMENT_LIMITS.allowedDocumentTypes[number];
export type AllowedFileType = AllowedImageType | AllowedDocumentType;

// Error messages in Portuguese
export const ATTACHMENT_ERROR_MESSAGES = {
  fileTooLargeImage: 'Imagem deve ter no máximo 20MB',
  fileTooLargeDocument: 'Documento deve ter no máximo 50MB',
  invalidType: 'Tipo de arquivo não permitido',
  uploadFailed: 'Falha no upload. Tente novamente.',
  processingTimeout: 'Processamento demorou muito. Tente novamente.',
  maxAttachmentsReached: 'Máximo de 10 anexos por mensagem',
  networkError: 'Erro de conexão. Verifique sua internet.',
} as const;
