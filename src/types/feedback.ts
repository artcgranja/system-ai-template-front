/**
 * Feedback Types
 * Type definitions for the feedback system
 */

/**
 * Feedback category types
 */
export type FeedbackCategory = 'feature_request' | 'design' | 'issue' | 'other';

/**
 * Feedback status types
 */
export type FeedbackStatus = 'pending' | 'in_review' | 'resolved' | 'rejected';

/**
 * Feedback entity from backend
 */
export interface Feedback {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  admin_response: string | null;
  admin_response_by: string | null;
  admin_response_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new feedback
 */
export interface CreateFeedbackInput {
  title: string;
  description: string;
  category: FeedbackCategory;
}

/**
 * Input for updating an existing feedback
 */
export interface UpdateFeedbackInput {
  title?: string;
  description?: string;
  category?: FeedbackCategory;
}

/**
 * Filters for listing feedbacks
 */
export interface FeedbackFilters {
  page?: number;
  page_size?: number;
  category?: FeedbackCategory;
  status?: FeedbackStatus;
}

/**
 * Filters for admin listing feedbacks (includes user_id filter)
 */
export interface AdminFeedbackFilters extends FeedbackFilters {
  user_id?: string;
}

/**
 * Input for admin to update feedback (status and response)
 */
export interface UpdateAdminFeedbackInput {
  status?: FeedbackStatus;
  admin_response?: string;
}

/**
 * Paginated response for feedback list
 */
export interface FeedbackListResponse {
  items: Feedback[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * Category labels for display
 */
export const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  feature_request: 'Solicitação de Funcionalidade',
  design: 'Design/UX',
  issue: 'Problema/Bug',
  other: 'Outros',
};

/**
 * Status labels for display
 */
export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  pending: 'Aguardando Análise',
  in_review: 'Em Análise',
  resolved: 'Resolvido',
  rejected: 'Rejeitado',
};

/**
 * Check if feedback can be edited by user
 * User can only edit if status is pending and admin hasn't responded
 */
export function canEditFeedback(feedback: Feedback): boolean {
  return feedback.status === 'pending' && feedback.admin_response === null;
}

/**
 * Check if feedback can be deleted by user
 * User can only delete if status is pending and admin hasn't responded
 */
export function canDeleteFeedback(feedback: Feedback): boolean {
  return feedback.status === 'pending' && feedback.admin_response === null;
}
