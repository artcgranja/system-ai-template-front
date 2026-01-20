/**
 * Conversations Hook
 * Manages conversation state and operations using generic CRUD hook + custom operations
 */

import { useCallback } from 'react';
import { useChatStore } from '@/lib/stores/chatStore';
import { chatApi, type CreateConversationInput } from '@/lib/api/chat';
import { useCrudResource } from './factories/useCrudResource';
import { useAuthCheck } from './utils/useAuthCheck';
import { QUERY_KEYS } from './config/queryConfig';
import type { Conversation } from '@/types/chat';

export function useConversations() {
  const {
    conversations,
    setConversations,
    appendConversations,
    addConversation,
    updateConversation: updateConversationStore,
    removeConversation,
    setLoadingConversations,
    setOperationLoading,
    isOperationLoading,
    conversationsOffset,
    conversationsHasMore,
    isLoadingMoreConversations,
    setConversationsPagination,
    setLoadingMoreConversations,
  } = useChatStore();

  const isAuthenticated = useAuthCheck();

  // Create API adapter to match CrudApiInterface
  // Initial load with pagination (100 conversations to cover most cases)
  // Order by updated_at descending to show most recent conversations first
  const apiAdapter = {
    getAll: async () => {
      const result = await chatApi.getConversations({
        limit: 100,
        offset: 0,
        order_by: '-updated_at' // Most recent first
      });
      // Check if there are more conversations
      // If we got exactly 100, there might be more. If less, we got all of them.
      const hasMore = result.length === 100;
      setConversationsPagination(result.length, hasMore);
      return result;
    },
    create: (input: string | CreateConversationInput) => chatApi.createConversation(input),
    update: chatApi.updateConversation,
    delete: chatApi.deleteConversation,
  };

  // Use generic CRUD hook
  const { isLoading, create, update, remove, refetch } = useCrudResource<
    Conversation,
    string | CreateConversationInput,
    Partial<Conversation>
  >({
    queryKey: QUERY_KEYS.conversations,
    api: apiAdapter,
    storeActions: {
      setAll: setConversations,
      add: addConversation,
      update: updateConversationStore,
      remove: removeConversation,
      setLoading: setLoadingConversations,
    },
    isAuthenticated,
  });

  // CRUD operations
  const createConversation = useCallback(
    async (title?: string): Promise<Conversation | undefined> => {
      return create(title || '');
    },
    [create]
  );

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      setOperationLoading('rename-conversation', id, true);
      try {
        return await update(id, { title });
      } finally {
        setOperationLoading('rename-conversation', id, false);
      }
    },
    [update, setOperationLoading]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      setOperationLoading('delete-conversation', id, true);
      try {
        return await remove(id);
      } finally {
        setOperationLoading('delete-conversation', id, false);
      }
    },
    [remove, setOperationLoading]
  );

  // Custom operations (pin, move to folder, duplicate)
  const togglePinConversation = useCallback(
    async (id: string) => {
      const conversation = conversations?.find((c) => c.id === id);
      if (!conversation) return;

      setOperationLoading('pin-conversation', id, true);
      try {
        const updated = await chatApi.pinConversation(id, !conversation.isPinned);
        // Update store with the response
        updateConversationStore(id, updated);
      } catch (error) {
        console.error('Error toggling pin:', error);
      } finally {
        setOperationLoading('pin-conversation', id, false);
      }
    },
    [conversations, updateConversationStore, setOperationLoading]
  );

  const moveConversationToFolder = useCallback(
    async (id: string, folderId: string | null) => {
      setOperationLoading('move-conversation', id, true);
      try {
        const updated = await chatApi.moveToFolder(id, folderId);
        // Update store with the response
        updateConversationStore(id, updated);
      } catch (error) {
        console.error('Error moving conversation:', error);
      } finally {
        setOperationLoading('move-conversation', id, false);
      }
    },
    [updateConversationStore, setOperationLoading]
  );

  const duplicateConversation = useCallback(
    async (id: string): Promise<Conversation | undefined> => {
      const conversation = conversations?.find((c) => c.id === id);
      if (!conversation) return;

      try {
        const newTitle = `${conversation.title} (cópia)`;
        return await createConversation(newTitle);
      } catch (error) {
        console.error('Error duplicating conversation:', error);
      }
    },
    [conversations, createConversation]
  );

  /**
   * Load more conversations (pagination)
   * Fetches the next batch of conversations and appends them to the existing list
   */
  const loadMoreConversations = useCallback(async () => {
    if (!conversationsHasMore || isLoadingMoreConversations) return;

    setLoadingMoreConversations(true);
    try {
      const nextBatch = await chatApi.getConversations({
        limit: 100,
        offset: conversationsOffset,
        order_by: '-updated_at' // Keep consistent ordering
      });

      if (nextBatch.length > 0) {
        appendConversations(nextBatch);
        // Check if there are more conversations to load
        // If we got exactly 100, there might be more. If less, we got all of them.
        const hasMore = nextBatch.length === 100;
        setConversationsPagination(conversationsOffset + nextBatch.length, hasMore);
      } else {
        // No more conversations
        setConversationsPagination(conversationsOffset, false);
      }
    } catch (error) {
      console.error('Error loading more conversations:', error);
    } finally {
      setLoadingMoreConversations(false);
    }
  }, [
    conversationsHasMore,
    isLoadingMoreConversations,
    conversationsOffset,
    appendConversations,
    setConversationsPagination,
    setLoadingMoreConversations,
  ]);

  return {
    conversations,
    isLoading,
    createConversation,
    renameConversation,
    deleteConversation,
    togglePinConversation,
    moveConversationToFolder,
    duplicateConversation,
    refetch,
    isOperationLoading,
    loadMoreConversations,
    conversationsHasMore,
    isLoadingMoreConversations,
  };
}
