/**
 * Feedback API Module
 * Handles all feedback-related API endpoints
 */

import apiClient, { handleApiResponse } from './client';
import type {
  Feedback,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  FeedbackFilters,
  FeedbackListResponse,
} from '@/types/feedback';

const FEEDBACK_ENDPOINT = '/api/feedback';

/**
 * Create a new feedback
 * @param data Feedback data to create
 * @returns Created feedback
 */
export async function createFeedback(data: CreateFeedbackInput): Promise<Feedback> {
  const response = await handleApiResponse<Feedback>(
    apiClient.post<Feedback>(FEEDBACK_ENDPOINT, data)
  );
  return response;
}

/**
 * Get paginated list of user's feedbacks
 * @param params Optional filters and pagination parameters
 * @returns Paginated feedback list
 */
export async function getMyFeedbacks(
  params?: FeedbackFilters
): Promise<FeedbackListResponse> {
  const queryParams = new URLSearchParams();
  
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.page_size) {
    queryParams.append('page_size', params.page_size.toString());
  }
  if (params?.category) {
    queryParams.append('category', params.category);
  }
  if (params?.status) {
    queryParams.append('status', params.status);
  }

  const queryString = queryParams.toString();
  const url = queryString ? `${FEEDBACK_ENDPOINT}?${queryString}` : FEEDBACK_ENDPOINT;

  const response = await handleApiResponse<FeedbackListResponse>(
    apiClient.get<FeedbackListResponse>(url)
  );
  return response;
}

/**
 * Get a single feedback by ID
 * @param feedbackId ID of the feedback
 * @returns Feedback details
 */
export async function getFeedbackById(feedbackId: string): Promise<Feedback> {
  const response = await handleApiResponse<Feedback>(
    apiClient.get<Feedback>(`${FEEDBACK_ENDPOINT}/${feedbackId}`)
  );
  return response;
}

/**
 * Update an existing feedback
 * @param feedbackId ID of the feedback to update
 * @param data Partial feedback data to update
 * @returns Updated feedback
 */
export async function updateFeedback(
  feedbackId: string,
  data: UpdateFeedbackInput
): Promise<Feedback> {
  const response = await handleApiResponse<Feedback>(
    apiClient.put<Feedback>(`${FEEDBACK_ENDPOINT}/${feedbackId}`, data)
  );
  return response;
}

/**
 * Delete a feedback
 * @param feedbackId ID of the feedback to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteFeedback(feedbackId: string): Promise<void> {
  await handleApiResponse<void>(
    apiClient.delete<{ message: string; deleted_id: string }>(
      `${FEEDBACK_ENDPOINT}/${feedbackId}`
    )
  );
}
