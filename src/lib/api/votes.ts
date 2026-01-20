import apiClient from './client';
import type { ApiError } from '@/types/api';

/**
 * Vote type: positive (thumbs up) or negative (thumbs down)
 */
export type VoteType = 'positive' | 'negative';

/**
 * Vote response from backend
 */
export interface Vote {
  id: string;
  user_id: string;
  message_ids: string[];
  vote_type: VoteType;
  created_at: string;
  updated_at: string;
}

/**
 * Votes summary response from backend
 */
export interface VotesSummary {
  positive_count: number;
  negative_count: number;
  total_count: number;
}

/**
 * Response from getMyVote endpoint
 */
export interface MyVoteResponse {
  vote: Vote | null;
}

/**
 * Create or update a vote for a set of messages
 * @param messageIds Array of message IDs (will be normalized/ordered by backend)
 * @param voteType Type of vote: 'positive' or 'negative'
 * @returns The created/updated vote
 */
export async function voteOnMessages(
  messageIds: string[],
  voteType: VoteType
): Promise<Vote> {
  if (!messageIds || messageIds.length === 0) {
    throw new Error('messageIds cannot be empty');
  }

  if (voteType !== 'positive' && voteType !== 'negative') {
    throw new Error('voteType must be "positive" or "negative"');
  }

  try {
    const response = await apiClient.post<Vote>('/api/votes', {
      message_ids: messageIds,
      vote_type: voteType,
    });

    return response.data;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to vote on messages');
  }
}

/**
 * @deprecated This endpoint has been removed. Vote data (user_vote) is now included directly in messages.
 * Get the current user's vote for a set of messages
 * @param messageIds Array of message IDs (will be normalized/ordered by backend)
 * @returns The user's vote or null if they haven't voted
 * 
 * Note: This function will throw an error as the endpoint no longer exists.
 * Use message.userVote instead, which is included when fetching messages.
 */
export async function getMyVote(messageIds: string[]): Promise<Vote | null> {
  if (!messageIds || messageIds.length === 0) {
    throw new Error('messageIds cannot be empty');
  }

  try {
    const messageIdsParam = messageIds.join(',');
    const response = await apiClient.get<MyVoteResponse>(
      `/api/votes/me?message_ids=${encodeURIComponent(messageIdsParam)}`
    );

    return response.data.vote;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to get vote');
  }
}

/**
 * @deprecated This endpoint has been removed. Vote summary data (vote_summary) is now included directly in messages.
 * Get votes summary (counts) for a set of messages
 * @param messageIds Array of message IDs (will be normalized/ordered by backend)
 * @returns Summary with positive, negative, and total counts
 * 
 * Note: This function will throw an error as the endpoint no longer exists.
 * Use message.voteSummary instead, which is included when fetching messages.
 */
export async function getVotesSummary(
  messageIds: string[]
): Promise<VotesSummary> {
  if (!messageIds || messageIds.length === 0) {
    throw new Error('messageIds cannot be empty');
  }

  try {
    const messageIdsParam = messageIds.join(',');
    const response = await apiClient.get<VotesSummary>(
      `/api/votes/summary?message_ids=${encodeURIComponent(messageIdsParam)}`
    );

    return response.data;
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to get votes summary');
  }
}

/**
 * Delete a vote by its ID
 * @param voteId ID of the vote to delete
 * @returns Success message
 */
export async function deleteVote(voteId: string): Promise<void> {
  if (!voteId) {
    throw new Error('voteId cannot be empty');
  }

  try {
    await apiClient.delete(`/api/votes/${voteId}`);
  } catch (error) {
    const apiError = error as ApiError;
    throw new Error(apiError.message || 'Failed to delete vote');
  }
}
