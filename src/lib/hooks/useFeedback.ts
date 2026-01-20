/**
 * Feedback Hook
 * Manages user feedback operations using React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthCheck } from './utils/useAuthCheck';
import { DEFAULT_QUERY_CONFIG, QUERY_KEYS } from './config/queryConfig';
import {
  createFeedback,
  getMyFeedbacks,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
} from '@/lib/api/feedback';
import type {
  Feedback,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  FeedbackFilters,
  FeedbackListResponse,
} from '@/types/feedback';

/**
 * Hook to fetch paginated list of user's feedbacks
 */
export function useFeedbacks(filters: FeedbackFilters = {}) {
  const isAuthenticated = useAuthCheck();

  return useQuery<FeedbackListResponse>({
    queryKey: QUERY_KEYS.feedbacks(filters),
    queryFn: () => getMyFeedbacks(filters),
    enabled: isAuthenticated,
    ...DEFAULT_QUERY_CONFIG,
  });
}

/**
 * Hook to fetch a single feedback by ID
 */
export function useFeedback(feedbackId: string) {
  const isAuthenticated = useAuthCheck();

  return useQuery<Feedback>({
    queryKey: QUERY_KEYS.feedback(feedbackId),
    queryFn: () => getFeedbackById(feedbackId),
    enabled: isAuthenticated && !!feedbackId,
    ...DEFAULT_QUERY_CONFIG,
  });
}

/**
 * Hook to create a new feedback
 */
export function useCreateFeedback() {
  const queryClient = useQueryClient();

  return useMutation<Feedback, Error, CreateFeedbackInput>({
    mutationFn: (data) => createFeedback(data),
    onSuccess: () => {
      // Invalidate feedbacks list to refresh
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useCreateFeedback] Error creating feedback:', error.message);
      }
    },
  });
}

/**
 * Hook to update an existing feedback
 */
export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation<
    Feedback,
    Error,
    { feedbackId: string; data: UpdateFeedbackInput }
  >({
    mutationFn: ({ feedbackId, data }) => updateFeedback(feedbackId, data),
    onSuccess: (data) => {
      // Invalidate both the list and the specific feedback
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.feedback(data.id),
      });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useUpdateFeedback] Error updating feedback:', error.message);
      }
    },
  });
}

/**
 * Hook to delete a feedback
 */
export function useDeleteFeedback() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (feedbackId) => deleteFeedback(feedbackId),
    onSuccess: () => {
      // Invalidate feedbacks list to refresh
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useDeleteFeedback] Error deleting feedback:', error.message);
      }
    },
  });
}
