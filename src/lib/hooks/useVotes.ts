import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  voteOnMessages,
  deleteVote,
  type VoteType,
  type VotesSummary,
} from '@/lib/api/votes';
import type { Message } from '@/types/chat';

interface UseVotesReturn {
  userVote: VoteType | null;
  summary: VotesSummary | null;
  loading: boolean;
  voting: boolean;
  handleVote: (voteType: VoteType) => Promise<void>;
  error: string | null;
}

/**
 * Global map to store vote IDs by message IDs key
 * This allows us to delete votes even after messages are refreshed
 * Key: sorted message IDs joined by comma
 * Value: vote ID
 */
const voteIdCache = new Map<string, string>();

/**
 * Custom hook to manage vote state and operations for a group of messages
 * Vote data is extracted from the messages themselves (userVote and voteSummary fields)
 * @param messageIds Array of message IDs to vote on (must be sorted/normalized)
 * @param messages Array of messages to extract vote data from
 * @param onVoteComplete Optional callback to refresh messages after voting
 */
export function useVotes(
  messageIds: string[],
  messages: Message[],
  onVoteComplete?: () => Promise<void>
): UseVotesReturn {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentVoteIdRef = useRef<string | null>(null);

  /**
   * Check if a message ID is a valid UUID (not a temporary ID)
   * Temporary IDs have patterns like: assistant-*, user-*, temp-*
   * Valid UUIDs follow the format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  const isValidMessageId = useCallback((id: string): boolean => {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // Reject temporary IDs that start with known prefixes
    if (id.startsWith('assistant-') || id.startsWith('user-') || id.startsWith('temp-')) {
      return false;
    }

    // UUID format: 8-4-4-4-12 hexadecimal characters separated by hyphens
    // Example: 550e8400-e29b-41d4-a716-446655440000
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }, []);

  // Normalize and memoize message IDs to prevent unnecessary re-renders
  // Filter out temporary IDs and create a stable sorted array
  const sortedIds = useMemo(() => {
    if (!messageIds || messageIds.length === 0) {
      return [];
    }
    // Filter out temporary IDs and sort
    const validIds = messageIds.filter(id => isValidMessageId(id));
    return validIds.sort();
  }, [messageIds, isValidMessageId]);

  const messageIdsKey = useMemo(() => {
    return sortedIds.join(',');
  }, [sortedIds]);

  /**
   * Extract vote data from messages
   * For grouped messages, we use the vote data from the first message in the group
   * (all messages in a group share the same vote)
   */
  const voteData = useMemo(() => {
    if (!sortedIds || sortedIds.length === 0 || !messages || messages.length === 0) {
      return {
        userVote: null as VoteType | null,
        summary: null as VotesSummary | null,
      };
    }

    // Find the first message that matches one of the sorted IDs
    // All messages in a group should have the same vote data
    const firstMessage = messages.find(msg => sortedIds.includes(msg.id));
    
    if (!firstMessage || firstMessage.role !== 'assistant') {
      return {
        userVote: null,
        summary: null,
      };
    }

    return {
      userVote: firstMessage.userVote ?? null,
      summary: firstMessage.voteSummary ?? null,
    };
  }, [sortedIds, messages]);

  // Load cached vote ID if available
  useEffect(() => {
    const cachedVoteId = voteIdCache.get(messageIdsKey);
    if (cachedVoteId) {
      currentVoteIdRef.current = cachedVoteId;
    }
  }, [messageIdsKey]);

  /**
   * Handle vote action (create, update, or delete)
   * Implements toggle logic: if voting same type, remove vote; otherwise update/create
   * Vote IDs are cached to enable efficient deletion
   */
  const handleVote = useCallback(
    async (voteType: VoteType) => {
      if (!sortedIds || sortedIds.length === 0 || voting) {
        return;
      }

      try {
        setVoting(true);
        setError(null);

        const currentUserVote = voteData.userVote;

        if (currentUserVote === voteType) {
          // User wants to remove their vote (toggle off)
          // Try to use cached vote ID first
          let voteIdToDelete = currentVoteIdRef.current || voteIdCache.get(messageIdsKey);
          
          if (!voteIdToDelete) {
            // If we don't have the vote ID cached, we need to create/update to get it
            // This happens on first toggle after page load
            const voteResponse = await voteOnMessages(sortedIds, voteType);
            voteIdToDelete = voteResponse.id;
          }
          
          // Delete the vote
          await deleteVote(voteIdToDelete);
          
          // Clear cache
          voteIdCache.delete(messageIdsKey);
          currentVoteIdRef.current = null;
        } else {
          // Create or update vote
          const voteResponse = await voteOnMessages(sortedIds, voteType);
          
          // Cache the vote ID for future deletions
          voteIdCache.set(messageIdsKey, voteResponse.id);
          currentVoteIdRef.current = voteResponse.id;
        }

        // Refresh messages to get updated vote data
        if (onVoteComplete) {
          await onVoteComplete();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to vote';
        setError(errorMessage);
        console.error('Error voting:', err);
      } finally {
        setVoting(false);
      }
    },
    [sortedIds, messageIdsKey, voteData.userVote, voting, onVoteComplete]
  );

  return {
    userVote: voteData.userVote,
    summary: voteData.summary,
    loading: false, // No loading state needed - data comes from messages
    voting,
    handleVote,
    error,
  };
}
