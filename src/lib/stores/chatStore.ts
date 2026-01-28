import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversation, Message, Folder } from '@/types/chat';
import type { ActivePlanState, PlanWorkflowStatus } from '@/types/planning';
import type { InterruptState, InterruptData, InterruptType } from '@/types/interrupt';
import { initialInterruptState } from '@/types/interrupt';
import { appendToolCallBlockRef } from '@/lib/utils/contentBlocks';

export type OperationType =
  | 'delete-conversation'
  | 'pin-conversation'
  | 'move-conversation'
  | 'rename-conversation'
  | 'create-folder'
  | 'rename-folder'
  | 'delete-folder';

interface ChatState {
  conversations: Conversation[];
  folders: Folder[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  isLoadingFolders: boolean;
  streamingMessageId: string | null;
  isSending: boolean;
  sidebarCollapsed: boolean;
  // Map of operation type + ID to loading state (e.g., "delete-conversation-123" -> true)
  operationLoadingStates: Record<string, boolean>;
  // Pagination state
  conversationsOffset: number;
  conversationsHasMore: boolean;
  isLoadingMoreConversations: boolean;

  // Planning workflow state (LangGraph interrupt pattern)
  activePlan: ActivePlanState | null;
  isPlanApprovalInProgress: boolean;

  // Interrupt state (LangGraph human-in-the-loop)
  activeInterrupt: InterruptState;

  // Pending real ID promises for new chat creation
  // Maps temp conversation ID to a promise that resolves with the real ID
  pendingRealIdPromises: Record<string, Promise<string>>;

  // Conversation Actions
  setConversations: (conversations: Conversation[]) => void;
  appendConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  updateConversationId: (oldId: string, newId: string) => void;
  removeConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  setConversationsPagination: (offset: number, hasMore: boolean) => void;
  setLoadingMoreConversations: (loading: boolean) => void;

  // Folder Actions
  setFolders: (folders: Folder[]) => void;
  addFolder: (folder: Folder) => void;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  removeFolder: (id: string) => void;

  // Message Actions
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  clearMessages: (conversationId: string) => void;

  // Tool Call Actions
  addToolCallToMessage: (conversationId: string, messageId: string, toolCallId: string, toolName: string, args: Record<string, unknown>) => void;
  updateToolCall: (conversationId: string, messageId: string, toolCallId: string, status: 'running') => void;
  updateToolCallStreamingContent: (conversationId: string, messageId: string, toolCallId: string, content: string) => void;
  completeToolCall: (conversationId: string, messageId: string, toolCallId: string, result: string, success: boolean, executionTime: number | null, error: string | null) => void;

  // Loading Actions
  setLoadingMessages: (loading: boolean) => void;
  setLoadingConversations: (loading: boolean) => void;
  setLoadingFolders: (loading: boolean) => void;
  setStreamingMessageId: (id: string | null) => void;
  setIsSending: (sending: boolean) => void;
  setOperationLoading: (operation: OperationType, id: string, loading: boolean) => void;
  isOperationLoading: (operation: OperationType, id: string) => boolean;

  // Planning Actions
  setActivePlan: (plan: ActivePlanState | null) => void;
  updateActivePlanStatus: (status: PlanWorkflowStatus, message?: string) => void;
  updateActivePlanPresentation: (files: ActivePlanState['presentationFiles'], presentationUrl?: string | null) => void;
  setPlanApprovalInProgress: (inProgress: boolean) => void;
  clearActivePlan: () => void;

  // Interrupt Actions
  setActiveInterrupt: (type: InterruptType, data: InterruptData, conversationId: string) => void;
  clearActiveInterrupt: () => void;

  // Pending Real ID Actions (for new chat deferred navigation)
  setPendingRealId: (tempId: string, promise: Promise<string>) => void;
  getPendingRealId: (tempId: string) => Promise<string> | undefined;
  clearPendingRealId: (tempId: string) => void;

  // UI Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;

  reset: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      folders: [],
      currentConversationId: null,
      messages: {},
      isLoadingMessages: false,
      isLoadingConversations: false,
      isLoadingFolders: false,
      streamingMessageId: null,
      isSending: false,
      sidebarCollapsed: false,
      operationLoadingStates: {},
      conversationsOffset: 0,
      conversationsHasMore: false,
      isLoadingMoreConversations: false,

      // Planning workflow state
      activePlan: null,
      isPlanApprovalInProgress: false,

      // Interrupt state
      activeInterrupt: initialInterruptState,

      // Pending real ID promises
      pendingRealIdPromises: {},

      // Conversation Actions
      setConversations: (conversations) =>
        set({ conversations, conversationsOffset: conversations.length, conversationsHasMore: conversations.length === 100 }),

      appendConversations: (conversations) =>
        set((state) => {
          // Avoid duplicates by checking IDs
          const existingIds = new Set(state.conversations.map((c) => c.id));
          const newConversations = conversations.filter((c) => !existingIds.has(c.id));
          const newOffset = state.conversationsOffset + newConversations.length;
          // If we got exactly 100, there might be more. If less, we got all of them.
          const hasMore = conversations.length === 100;
          return {
            conversations: [...state.conversations, ...newConversations],
            conversationsOffset: newOffset,
            conversationsHasMore: hasMore,
          };
        }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [conversation, ...state.conversations],
        })),

      updateConversation: (id, updates) =>
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates } : conv
          ),
        })),

      updateConversationId: (oldId, newId) =>
        set((state) => {
          // Update conversation ID in conversations array
          const updatedConversations = state.conversations.map((conv) =>
            conv.id === oldId ? { ...conv, id: newId } : conv
          );

          // Update messages record key and update conversationId in each message
          const updatedMessages = { ...state.messages };
          if (updatedMessages[oldId]) {
            // Move messages to new key and update their conversationId
            updatedMessages[newId] = updatedMessages[oldId].map((msg) => ({
              ...msg,
              conversationId: newId,
            }));
            delete updatedMessages[oldId];
          }

          // Update current conversation ID if needed
          const updatedCurrentId =
            state.currentConversationId === oldId ? newId : state.currentConversationId;

          return {
            conversations: updatedConversations,
            messages: updatedMessages,
            currentConversationId: updatedCurrentId,
          };
        }),

      removeConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
          messages: Object.fromEntries(
            Object.entries(state.messages).filter(([key]) => key !== id)
          ),
        })),

      setCurrentConversation: (id) => set({ currentConversationId: id }),

      // Folder Actions
      setFolders: (folders) => set({ folders }),

      addFolder: (folder) =>
        set((state) => ({
          folders: [...state.folders, folder],
        })),

      updateFolder: (id, updates) =>
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, ...updates } : folder
          ),
        })),

      removeFolder: (id) =>
        set((state) => ({
          folders: state.folders.filter((folder) => folder.id !== id),
          // Remove folder reference from conversations
          conversations: state.conversations.map((conv) =>
            conv.folderId === id ? { ...conv, folderId: null } : conv
          ),
        })),

      // Message Actions
      setMessages: (conversationId, messages) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: messages,
          },
        })),

      addMessage: (conversationId, message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message],
          },
        })),

      updateMessage: (conversationId, messageId, updates) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: state.messages[conversationId]?.map((msg) =>
              msg.id === messageId ? { ...msg, ...updates } : msg
            ) || [],
          },
        })),

      clearMessages: (conversationId) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: [],
          },
        })),

      // Tool Call Actions
      addToolCallToMessage: (conversationId, messageId, toolCallId, toolName, args) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: state.messages[conversationId]?.map((msg) => {
              if (msg.id !== messageId) return msg;

              // Skip if tool call with this ID already exists (prevents duplicates)
              const existingToolCall = msg.toolCalls?.find(tc => tc.id === toolCallId);
              if (existingToolCall) {
                return msg;
              }

              return {
                ...msg,
                toolCalls: [
                  ...(msg.toolCalls || []),
                  {
                    id: toolCallId,
                    tool_name: toolName,
                    arguments: args,
                    status: 'starting' as const,
                  },
                ],
                // Add reference to contentBlockRefs (order tracking)
                // The actual toolCall data is derived from toolCalls[] at render time
                contentBlockRefs: appendToolCallBlockRef(msg.contentBlockRefs, toolCallId),
              };
            }) || [],
          },
        })),

      // Update tool call status - only updates toolCalls[] (single source of truth)
      // contentBlocks are derived at render time via deriveContentBlocks()
      updateToolCall: (conversationId, messageId, toolCallId, status) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: state.messages[conversationId]?.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    toolCalls: msg.toolCalls?.map((tc) =>
                      tc.id === toolCallId ? { ...tc, status } : tc
                    ),
                  }
                : msg
            ) || [],
          },
        })),

      // Append streaming content to tool call - only updates toolCalls[] (single source of truth)
      // contentBlocks are derived at render time via deriveContentBlocks()
      updateToolCallStreamingContent: (conversationId, messageId, toolCallId, content) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: state.messages[conversationId]?.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    toolCalls: msg.toolCalls?.map((tc) =>
                      tc.id === toolCallId
                        ? { ...tc, streamingContent: (tc.streamingContent || '') + content }
                        : tc
                    ),
                  }
                : msg
            ) || [],
          },
        })),

      // Complete tool call with result - only updates toolCalls[] (single source of truth)
      // contentBlocks are derived at render time via deriveContentBlocks()
      completeToolCall: (conversationId, messageId, toolCallId, result, success, executionTime, error) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: state.messages[conversationId]?.map((msg) =>
              msg.id === messageId
                ? {
                    ...msg,
                    toolCalls: msg.toolCalls?.map((tc) =>
                      tc.id === toolCallId
                        ? {
                            ...tc,
                            status: error ? ('error' as const) : ('completed' as const),
                            result,
                            success,
                            execution_time: executionTime,
                            error,
                            streamingContent: undefined, // Clear streaming content when complete
                          }
                        : tc
                    ),
                  }
                : msg
            ) || [],
          },
        })),

      // Loading Actions
      setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),

      setLoadingConversations: (loading) => set({ isLoadingConversations: loading }),

      setLoadingFolders: (loading) => set({ isLoadingFolders: loading }),

      setStreamingMessageId: (id) => set({ streamingMessageId: id }),

      setIsSending: (sending) => set({ isSending: sending }),

      setOperationLoading: (operation, id, loading) =>
        set((state) => ({
          operationLoadingStates: {
            ...state.operationLoadingStates,
            [`${operation}-${id}`]: loading,
          },
        })),

      isOperationLoading: (operation, id) => {
        const state = get();
        return state.operationLoadingStates[`${operation}-${id}`] || false;
      },

      // Planning Actions
      setActivePlan: (plan) => set({ activePlan: plan }),

      updateActivePlanStatus: (status, message) =>
        set((state) => ({
          activePlan: state.activePlan
            ? { ...state.activePlan, status, message: message || state.activePlan.message }
            : null,
        })),

      updateActivePlanPresentation: (files, presentationUrl) =>
        set((state) => ({
          activePlan: state.activePlan
            ? { ...state.activePlan, presentationFiles: files, presentationUrl }
            : null,
        })),

      setPlanApprovalInProgress: (inProgress) =>
        set({ isPlanApprovalInProgress: inProgress }),

      clearActivePlan: () =>
        set({ activePlan: null, isPlanApprovalInProgress: false }),

      // Interrupt Actions
      setActiveInterrupt: (type, data, conversationId) =>
        set({
          activeInterrupt: {
            active: true,
            type,
            data,
            conversationId,
          },
        }),

      clearActiveInterrupt: () =>
        set({ activeInterrupt: initialInterruptState }),

      // Pending Real ID Actions
      setPendingRealId: (tempId, promise) =>
        set((state) => ({
          pendingRealIdPromises: {
            ...state.pendingRealIdPromises,
            [tempId]: promise,
          },
        })),

      getPendingRealId: (tempId) => {
        const state = get();
        return state.pendingRealIdPromises[tempId];
      },

      clearPendingRealId: (tempId) =>
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [tempId]: _, ...rest } = state.pendingRealIdPromises;
          return { pendingRealIdPromises: rest };
        }),

      // UI Actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setConversationsPagination: (offset, hasMore) =>
        set({ conversationsOffset: offset, conversationsHasMore: hasMore }),

      setLoadingMoreConversations: (loading) => set({ isLoadingMoreConversations: loading }),

      reset: () =>
        set({
          conversations: [],
          folders: [],
          currentConversationId: null,
          messages: {},
          isLoadingMessages: false,
          isLoadingConversations: false,
          isLoadingFolders: false,
          streamingMessageId: null,
          isSending: false,
          sidebarCollapsed: false,
          operationLoadingStates: {},
          conversationsOffset: 0,
          conversationsHasMore: false,
          isLoadingMoreConversations: false,
          activePlan: null,
          isPlanApprovalInProgress: false,
          activeInterrupt: initialInterruptState,
          pendingRealIdPromises: {},
        }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
