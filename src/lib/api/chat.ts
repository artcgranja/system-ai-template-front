/**
 * Conversations API
 * Manages conversation operations using generic CRUD factory + custom methods
 */

import apiClient, { handleApiResponse } from './client';
import { createCrudApi } from './factory/createCrudApi';
import { createTransformer } from '@/lib/utils/transformers';
import { getAccessToken, getRefreshToken } from '@/lib/utils/auth';
import { API_CONFIG, STORAGE_KEYS, ROUTES } from '@/config/constants';
import type { Conversation, BackendConversation, Message, BackendMessage, CreateMessagePayload, ContentBlockRef, MessageAttachment, BackendMessageAttachment } from '@/types/chat';
import type { InterruptResponse } from '@/types/interrupt';
import type { ApiResponse } from '@/types/api';
import type { BackendLoginResponse } from '@/types/auth';

/**
 * Transformer for converting between backend and frontend conversation formats
 * Automatically handles:
 * - snake_case → camelCase conversion
 * - Date string → Date object conversion (created_at, updated_at, pinned_at)
 */
const conversationTransformer = createTransformer<Conversation, BackendConversation>({
  dateFields: ['createdAt', 'updatedAt', 'pinnedAt'],
});

/**
 * Transform backend attachment to frontend format
 */
function transformAttachment(backend: BackendMessageAttachment): MessageAttachment {
  return {
    id: backend.id,
    originalFilename: backend.original_filename,
    mimeType: backend.mime_type,
    fileSizeBytes: backend.file_size_bytes,
    status: backend.status,
  };
}

/**
 * Transformer for converting between backend and frontend message formats
 * Automatically handles:
 * - snake_case → camelCase conversion (conversation_id → conversationId)
 * - Date string → Date object conversion (created_at → timestamp)
 */
const messageTransformer = createTransformer<Message, BackendMessage>({
  customMappings: {
    timestamp: (backend) => new Date(backend.created_at),
    conversationId: 'conversation_id',
    messageType: 'message_type',
    toolCallId: 'tool_call_id',
    toolName: 'tool_name',
    toolArguments: 'tool_arguments',
    sequenceNumber: 'sequence_number',
    attachments: (backend) => backend.attachments?.map(transformAttachment) || [],
    userVote: 'user_vote',
    voteSummary: 'vote_summary',
  },
});

/**
 * Reconstruct tool calls from flat message history
 * Groups tool_call and tool_result messages into the assistant message's toolCalls array
 * Creates contentBlockRefs for proper inline display of tools
 *
 * Uses the derived state pattern:
 * - toolCalls[] is the single source of truth for tool call data
 * - contentBlockRefs[] stores only the ORDER of blocks (with IDs for tool calls)
 * - ContentBlocks are derived at render time via deriveContentBlocks()
 */
function reconstructToolCalls(messages: Message[]): Message[] {
  const result: Message[] = [];
  let currentAssistantMessage: Message | null = null;
  const toolCallMap = new Map<string, number>(); // Maps tool_call_id to index in toolCalls array
  const contentBlockRefsMap = new Map<string, ContentBlockRef[]>(); // Maps message id to contentBlockRefs

  for (const message of messages) {
    // User messages - push directly
    if (message.role === 'user') {
      // Push any pending assistant message first
      if (currentAssistantMessage) {
        // Attach contentBlockRefs if they exist
        const assistantId = currentAssistantMessage.id;
        const contentBlockRefs = contentBlockRefsMap.get(assistantId);
        if (contentBlockRefs && contentBlockRefs.length > 0) {
          currentAssistantMessage.contentBlockRefs = contentBlockRefs;
        }
        result.push(currentAssistantMessage);
        contentBlockRefsMap.delete(assistantId);
        currentAssistantMessage = null;
        toolCallMap.clear();
      }
      result.push(message);
      continue;
    }

    // Assistant text message - create new assistant message
    if (message.role === 'assistant' && message.messageType === 'text') {
      // Push any pending assistant message first
      if (currentAssistantMessage) {
        // Attach contentBlockRefs if they exist
        const contentBlockRefs = contentBlockRefsMap.get(currentAssistantMessage.id);
        if (contentBlockRefs && contentBlockRefs.length > 0) {
          currentAssistantMessage.contentBlockRefs = contentBlockRefs;
        }
        result.push(currentAssistantMessage);
        toolCallMap.clear();
        contentBlockRefsMap.delete(currentAssistantMessage.id);
      }
      currentAssistantMessage = { ...message, toolCalls: [] };
      // Add text content block ref if there's content
      if (message.content && message.content.trim().length > 0) {
        contentBlockRefsMap.set(currentAssistantMessage.id, [
          { type: 'text', content: message.content }
        ]);
      } else {
        contentBlockRefsMap.set(currentAssistantMessage.id, []);
      }
      continue;
    }

    // Tool call message (assistant calling a tool)
    if (message.messageType === 'tool_call') {
      // Create assistant message if none exists
      if (!currentAssistantMessage) {
        currentAssistantMessage = {
          id: `assistant-${message.id}`,
          role: 'assistant',
          content: '',
          timestamp: message.timestamp,
          conversationId: message.conversationId,
          toolCalls: [],
          messageType: 'text',
        };
        contentBlockRefsMap.set(currentAssistantMessage.id, []);
      }

      const toolCallId = message.toolCallId || message.id;
      const toolCall = {
        id: toolCallId,
        tool_name: message.toolName || '',
        arguments: message.toolArguments || {},
        status: 'completed' as const, // Historical calls are completed
        result: undefined as string | undefined,
        success: undefined as boolean | undefined,
      };

      currentAssistantMessage.toolCalls = currentAssistantMessage.toolCalls || [];
      toolCallMap.set(toolCallId, currentAssistantMessage.toolCalls.length);
      currentAssistantMessage.toolCalls.push(toolCall);

      // Add tool call REFERENCE to contentBlockRefs (not the full toolCall)
      // The actual toolCall data is derived at render time from toolCalls[]
      const contentBlockRefs = contentBlockRefsMap.get(currentAssistantMessage.id) || [];
      contentBlockRefs.push({ type: 'tool_call', toolCallId });
      contentBlockRefsMap.set(currentAssistantMessage.id, contentBlockRefs);
      continue;
    }

    // Tool result message - parse JSON content to extract call_id and result
    if (message.messageType === 'tool_result' || message.role === 'tool') {
      let toolCallId: string | undefined = message.toolCallId;
      let toolName: string | undefined = message.toolName;
      let toolResult: string | undefined = message.content;
      let success: boolean = true;
      let error: string | null = null;

      // If role is 'tool', parse the JSON string in content
      if (message.role === 'tool' && message.content) {
        try {
          const parsedContent = JSON.parse(message.content);
          // Extract call_id from parsed JSON
          if (parsedContent.call_id) {
            toolCallId = parsedContent.call_id;
          }
          // Extract tool_name from parsed JSON
          if (parsedContent.tool_name) {
            toolName = parsedContent.tool_name;
          }
          // Extract result from parsed JSON
          if (parsedContent.result) {
            toolResult = parsedContent.result;
          }
          // Extract success and error
          if (typeof parsedContent.success === 'boolean') {
            success = parsedContent.success;
          }
          if (parsedContent.error) {
            error = parsedContent.error;
          }
        } catch (e) {
          // If parsing fails, use content as-is and try to extract toolCallId from message
          console.warn('Failed to parse tool message content:', e);
        }
      }

      // Ensure we have an assistant message to attach the tool call to
      if (!currentAssistantMessage) {
        // Look for the last assistant message in result that might have triggered this tool
        // This handles the case where tool results come after we've already pushed the assistant message
        let lastAssistantIndex = -1;
        for (let i = result.length - 1; i >= 0; i--) {
          if (result[i].role === 'assistant') {
            lastAssistantIndex = i;
            break;
          }
        }
        
        if (lastAssistantIndex !== -1) {
          // Use the last assistant message and remove it from result temporarily
          // We'll add it back when we're done processing tool results
          currentAssistantMessage = result[lastAssistantIndex];
          result.splice(lastAssistantIndex, 1); // Remove it from result
          // Ensure it has the necessary structures
          if (!currentAssistantMessage.toolCalls) {
            currentAssistantMessage.toolCalls = [];
          }
          if (!contentBlockRefsMap.has(currentAssistantMessage.id)) {
            // Reconstruct contentBlockRefs if needed
            const existingContent = currentAssistantMessage.content || '';
            if (existingContent.trim().length > 0) {
              contentBlockRefsMap.set(currentAssistantMessage.id, [
                { type: 'text', content: existingContent }
              ]);
            } else {
              contentBlockRefsMap.set(currentAssistantMessage.id, []);
            }
          }
          // Rebuild toolCallMap from existing toolCalls
          if (currentAssistantMessage.toolCalls) {
            currentAssistantMessage.toolCalls.forEach((tc, idx) => {
              toolCallMap.set(tc.id, idx);
            });
          }
        } else {
          // Create a new assistant message for orphaned tool results
          currentAssistantMessage = {
            id: `assistant-${message.id}`,
            role: 'assistant',
            content: '',
            timestamp: message.timestamp,
            conversationId: message.conversationId,
            toolCalls: [],
            messageType: 'text',
          };
          contentBlockRefsMap.set(currentAssistantMessage.id, []);
        }
      }

      if (currentAssistantMessage && toolCallId) {
        // Check if tool call already exists
        if (!toolCallMap.has(toolCallId)) {
          // Create tool call from tool result if it doesn't exist
          const toolCallStatus: 'error' | 'completed' = error ? 'error' : 'completed';
          const toolCall = {
            id: toolCallId,
            tool_name: toolName || '',
            arguments: {}, // Tool arguments not available in tool result messages
            status: toolCallStatus,
            result: toolResult,
            success: success,
            error: error || undefined,
          };

          currentAssistantMessage.toolCalls = currentAssistantMessage.toolCalls || [];
          toolCallMap.set(toolCallId, currentAssistantMessage.toolCalls.length);
          currentAssistantMessage.toolCalls.push(toolCall);

          // Add tool call REFERENCE to contentBlockRefs (not the full toolCall)
          const contentBlockRefs = contentBlockRefsMap.get(currentAssistantMessage.id) || [];
          contentBlockRefs.push({ type: 'tool_call', toolCallId });
          contentBlockRefsMap.set(currentAssistantMessage.id, contentBlockRefs);
        } else {
          // Update existing tool call - only update toolCalls[] (single source of truth)
          // No need to update contentBlockRefs - they just store the ID reference
          const index = toolCallMap.get(toolCallId)!;
          if (currentAssistantMessage.toolCalls && currentAssistantMessage.toolCalls[index]) {
            currentAssistantMessage.toolCalls[index].result = toolResult;
            currentAssistantMessage.toolCalls[index].success = success;
            if (error) {
              currentAssistantMessage.toolCalls[index].error = error;
              currentAssistantMessage.toolCalls[index].status = 'error';
            }
            // contentBlockRefs don't need updating - they just store the toolCallId
            // The actual data is derived from toolCalls[] at render time
          }
        }
      }
      continue;
    }

    // Any other message type - push directly
    if (currentAssistantMessage) {
      // Attach contentBlockRefs if they exist
      const contentBlockRefs = contentBlockRefsMap.get(currentAssistantMessage.id);
      if (contentBlockRefs && contentBlockRefs.length > 0) {
        currentAssistantMessage.contentBlockRefs = contentBlockRefs;
      }
      result.push(currentAssistantMessage);
      contentBlockRefsMap.delete(currentAssistantMessage.id);
      currentAssistantMessage = null;
      toolCallMap.clear();
    }
    result.push(message);
  }

  // Push final assistant message if exists
  if (currentAssistantMessage) {
    // Attach contentBlockRefs if they exist
    const contentBlockRefs = contentBlockRefsMap.get(currentAssistantMessage.id);
    if (contentBlockRefs && contentBlockRefs.length > 0) {
      currentAssistantMessage.contentBlockRefs = contentBlockRefs;
    }
    result.push(currentAssistantMessage);
    contentBlockRefsMap.delete(currentAssistantMessage.id);
  }

  return result;
}

/**
 * Helper function to make fetch requests with automatic token refresh on 401
 */
async function fetchWithTokenRefresh(
  url: string,
  options: RequestInit
): Promise<Response> {
  // Get current token
  const token = getAccessToken();

  // Add authorization header if token exists
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Make initial request
  let response = await fetch(url, { ...options, headers });

  // If 401, attempt token refresh
  if (response.status === 401) {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      // No refresh token available, redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.user);
        document.cookie = 'vora_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = ROUTES.login;
      }
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    try {
      // Attempt to refresh token
      const refreshResponse = await fetch(`${API_CONFIG.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Token refresh failed');
      }

      const refreshData: BackendLoginResponse = await refreshResponse.json();
      const { access_token, refresh_token } = refreshData;

      // Update stored tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
        localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token);

        // Update cookie for Next.js middleware
        const expiryDays = 30;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
        document.cookie = `vora_access_token=${access_token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
      }

      // Retry original request with new token
      const retryHeaders = {
        ...options.headers,
        Authorization: `Bearer ${access_token}`,
      };
      response = await fetch(url, { ...options, headers: retryHeaders });
    } catch {
      // Refresh failed, clear auth and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.accessToken);
        localStorage.removeItem(STORAGE_KEYS.refreshToken);
        localStorage.removeItem(STORAGE_KEYS.user);
        document.cookie = 'vora_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = ROUTES.login;
      }
      throw new Error('Falha na autenticação. Por favor, faça login novamente.');
    }
  }

  return response;
}

/**
 * Create input type for conversation creation
 */
export interface CreateConversationInput {
  title?: string;
}

/**
 * Base CRUD operations generated by factory
 */
const baseCrudApi = createCrudApi<
  Conversation,
  BackendConversation,
  CreateConversationInput,
  Partial<Conversation>
>({
  endpoint: '/api/conversations',
  transformer: conversationTransformer,
});

/**
 * Query parameters for filtering and paginating conversations
 */
export interface GetConversationsParams {
  limit?: number; // Max results (1-100, default: 50)
  offset?: number; // Number of results to skip (default: 0)
  folder_id?: string | 'none'; // Filter by folder (null/omit = all, "none" = no folder, uuid = specific folder)
  pinned_only?: boolean; // Show only pinned conversations (default: false)
  order_by?: string; // Field to order by (default: -updated_at for most recent first)
}

/**
 * Conversations API with CRUD operations + custom message-related methods
 */
export const chatApi = {
  /**
   * Get all conversations with optional filtering and pagination
   * GET /api/conversations?limit=...&offset=...&folder_id=...&pinned_only=...
   */
  getConversations: async (params?: GetConversationsParams): Promise<Conversation[]> => {
    // If no params, use base CRUD getAll
    if (!params) {
      return baseCrudApi.getAll();
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    if (params.folder_id) queryParams.append('folder_id', params.folder_id);
    if (params.pinned_only) queryParams.append('pinned_only', 'true');
    if (params.order_by) queryParams.append('order_by', params.order_by);

    const queryString = queryParams.toString();
    const url = queryString ? `/api/conversations?${queryString}` : '/api/conversations';

    const backendConversations = await handleApiResponse<BackendConversation[]>(
      apiClient.get<ApiResponse<BackendConversation[]>>(url)
    );
    return backendConversations.map(conversationTransformer.fromBackend);
  },

  getConversation: baseCrudApi.getById,

  /**
   * Create a new conversation
   * Accepts either a title string or a full CreateConversationInput object
   */
  createConversation: async (titleOrInput?: string | CreateConversationInput): Promise<Conversation> => {
    const input = typeof titleOrInput === 'string'
      ? { title: titleOrInput }
      : titleOrInput || {};
    return baseCrudApi.create(input);
  },

  updateConversation: baseCrudApi.update,
  deleteConversation: baseCrudApi.delete,

  /**
   * Pin or unpin a conversation
   * PATCH /api/conversations/:id/pin
   */
  pinConversation: async (id: string, isPinned: boolean): Promise<Conversation> => {
    const backendConversation = await handleApiResponse<BackendConversation>(
      apiClient.patch<ApiResponse<BackendConversation>>(
        `/api/conversations/${id}/pin`,
        { is_pinned: isPinned }
      )
    );
    return conversationTransformer.fromBackend(backendConversation);
  },

  /**
   * Move conversation to a folder or remove from folder
   * PATCH /api/conversations/:id/folder
   */
  moveToFolder: async (id: string, folderId: string | null): Promise<Conversation> => {
    const backendConversation = await handleApiResponse<BackendConversation>(
      apiClient.patch<ApiResponse<BackendConversation>>(
        `/api/conversations/${id}/folder`,
        { folder_id: folderId }
      )
    );
    return conversationTransformer.fromBackend(backendConversation);
  },

  /**
   * Get messages for a conversation
   * Fetches messages and reconstructs tool calls from flat history
   */
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const backendMessages = await handleApiResponse<BackendMessage[]>(
      apiClient.get<ApiResponse<BackendMessage[]>>(
        `/api/conversations/${conversationId}/messages`
      )
    );
    const transformedMessages = backendMessages.map(messageTransformer.fromBackend);
    // Reconstruct tool calls: merge tool_call and tool_result into assistant messages
    return reconstructToolCalls(transformedMessages);
  },

  /**
   * Send a message to an existing conversation and get streaming response
   * This returns a ReadableStream for SSE
   * POST /api/chat
   *
   * Payload: { message: string, conversation_id: string }
   *
   * The SSE stream will include:
   * - event: user_message_saved (with user_message_id)
   * - event: assistant_message_start (with message_id)
   * - event: assistant_message_chunk (with content chunks)
   * - event: assistant_message_complete (with full_content)
   * - event: done (stream complete)
   */
  sendMessage: async (payload: CreateMessagePayload): Promise<Response> => {
    const response = await fetchWithTokenRefresh(
      `${apiClient.defaults.baseURL}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to send message');
    }

    return response;
  },

  /**
   * Send a message to create a new conversation and get streaming response
   * This returns a ReadableStream for SSE
   * POST /api/chat/new
   *
   * Payload: { message: string, attachment_ids?: string[] }
   *
   * The SSE stream will include:
   * - event: conversation_created (with conversation_id, title, user_message_id)
   * - event: user_message_saved (with user_message_id)
   * - event: assistant_message_start (with message_id)
   * - event: assistant_message_chunk (with content chunks)
   * - event: assistant_message_complete (with full_content)
   * - event: done (stream complete)
   */
  sendNewChatMessage: async (content: string, attachmentIds?: string[]): Promise<Response> => {
    const payload: { message: string; attachment_ids?: string[] } = { message: content };
    if (attachmentIds && attachmentIds.length > 0) {
      payload.attachment_ids = attachmentIds;
    }

    const response = await fetchWithTokenRefresh(
      `${apiClient.defaults.baseURL}/api/chat/new`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to send new chat message');
    }

    return response;
  },

  /**
   * @deprecated Use resumeWorkflow() instead.
   *
   * This endpoint is deprecated in favor of the unified /resume endpoint.
   * Use resumeWorkflow(conversationId, { action, feedback }) instead.
   *
   * Respond to a plan awaiting approval (approve/reject/comment)
   * Returns SSE stream with plan workflow events
   * POST /api/plans/{plan_id}/respond
   *
   * The SSE stream will include:
   * - event: plan_processing (processing started)
   * - event: plan_generating (generating new version after comment)
   * - event: plan_awaiting_approval (new plan version ready)
   * - event: presentation_generating (generating presentation after approval)
   * - event: presentation_complete (presentation generated)
   * - event: error (error occurred)
   * - event: done (workflow complete)
   */
  respondToPlan: async (
    planId: string,
    payload: {
      action: 'approve' | 'reject' | 'comment';
      feedback?: string;
      thread_id: string;
    }
  ): Promise<Response> => {
    console.warn(
      '[DEPRECATED] chatApi.respondToPlan() is deprecated. Use chatApi.resumeWorkflow() instead.'
    );
    const response = await fetchWithTokenRefresh(
      `${apiClient.defaults.baseURL}/api/plans/${planId}/respond`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to respond to plan');
    }

    return response;
  },

  /**
   * Resume a workflow after an interrupt (LangGraph human-in-the-loop)
   * Sends the user's response to continue the interrupted workflow
   * POST /api/chat/{conversation_id}/resume
   *
   * Payload: { resume_data: object }
   *
   * The resume_data content depends on the interrupt type:
   * - clarification_questions: { "question_id": "answer", ... }
   * - plan_approval: { "action": "approve" } or { "action": "revise", "feedback": "..." }
   *
   * The SSE stream will include:
   * - workflow_resumed: Workflow continued
   * - assistant_message_chunk: Text chunks
   * - tool_call_start: Tool call started
   * - tool_call_complete: Tool call finished
   * - text_block_complete: Text block complete
   * - assistant_message_complete: Final message
   * - done: Stream finished
   */
  resumeWorkflow: async (
    conversationId: string,
    resumeData: InterruptResponse
  ): Promise<Response> => {
    const response = await fetchWithTokenRefresh(
      `${apiClient.defaults.baseURL}/api/chat/${conversationId}/resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: resumeData,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to resume workflow');
    }

    return response;
  },
};
