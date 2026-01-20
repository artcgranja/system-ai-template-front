import { useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { useChatStore } from '@/lib/stores/chatStore';
import { chatApi } from '@/lib/api/chat';
// Note: interruptParser utilities are deprecated - interrupts now come as direct SSE events
// See @/lib/utils/interruptParser.ts for backward compatibility utilities if needed
import type { Message, Conversation, ContentBlockRef, MessageAttachment } from '@/types/chat';
import { appendTextBlockRef } from '@/lib/utils/contentBlocks';
import {
  completeRunningToolCallForInterrupt,
  setupPlanApprovalInterrupt,
  setupClarificationInterrupt,
  INTERRUPT_MESSAGES,
} from '@/lib/utils/interruptHelpers';
import {
  isPresentationGenerationTool,
  parsePlanningToolResult,
  normalizePresentationFiles,
} from '@/lib/utils/planningTools';

// ========================================
// Shared Streaming Helper Functions
// ========================================

interface ConversationCreatedData {
  conversation_id: string;
  conversation_title: string;
  user_message_id: string;
  user_message_content: string;
  created_at: string;
}

interface StreamEventCallbacks {
  onConversationCreated?: (conversationId: string, data: ConversationCreatedData) => void;
  onUserMessageSaved?: (messageId: string) => void;
}

/**
 * Extracts text content from content array structure
 * Content can be either a string or an array of objects with text, type, index
 */
function extractTextContent(content: string | Array<{ text: string; type: string; index: number }>): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    // Sort by index to maintain order, then extract text
    return content
      .sort((a, b) => a.index - b.index)
      .map((item) => item.text)
      .join('');
  }
  return '';
}

/**
 * Processes Server-Sent Events (SSE) stream from chat API
 * Handles all streaming events according to the SSE format:
 * - event: {type}
 * - data: {json}
 * - (empty line)
 */
async function processStreamEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  conversationId: string,
  assistantMessageId: string,
  callbacks: StreamEventCallbacks,
  onChunk?: (chunk: string) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const decoder = new TextDecoder();
  const {
    addMessage,
    updateMessage,
    setStreamingMessageId,
    setIsSending,
    addToolCallToMessage,
    updateToolCall,
    updateToolCallStreamingContent,
    completeToolCall
  } = useChatStore.getState();
  
  // Helper to get current messages for a conversation (always gets fresh state)
  const getMessages = (convId: string) => {
    const state = useChatStore.getState();
    return state.messages[convId] || [];
  };

  let accumulatedContent = '';
  let buffer = '';
  let currentConversationId = conversationId;
  let currentAssistantMessageId = assistantMessageId;
  let streamComplete = false;
  let assistantMessageCreated = false;

  // Tool content streaming buffer for batching updates (reduces re-renders)
  const toolContentBuffer: Map<string, { toolName: string; callId: string | null; content: string }> = new Map();
  let toolContentFlushTimer: ReturnType<typeof setTimeout> | null = null;
  const TOOL_CONTENT_FLUSH_INTERVAL = 100; // ms - batch updates every 100ms

  // Text content streaming buffer for batching updates (reduces re-renders)
  // Using shorter interval than tools for more responsive text streaming
  let textContentFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingTextUpdate = false;
  const TEXT_CONTENT_FLUSH_INTERVAL = 50; // ms - batch text updates every 50ms

  // Flush tool content buffer to store
  const flushToolContentBuffer = () => {
    if (toolContentFlushTimer) {
      clearTimeout(toolContentFlushTimer);
      toolContentFlushTimer = null;
    }

    toolContentBuffer.forEach((data) => {
      if (data.content) {
        handleToolContentChunk(
          currentConversationId,
          currentAssistantMessageId,
          data.toolName,
          data.callId,
          data.content,
          updateToolCallStreamingContent,
          getMessages
        );
      }
    });
    toolContentBuffer.clear();
  };

  // Flush text content buffer to store
  const flushTextContentBuffer = () => {
    if (textContentFlushTimer) {
      clearTimeout(textContentFlushTimer);
      textContentFlushTimer = null;
    }

    if (!pendingTextUpdate) return;
    pendingTextUpdate = false;

    // Get current message state
    const messages = getMessages(currentConversationId);
    const currentMessage = messages.find(m => m.id === currentAssistantMessageId);
    const currentContent = currentMessage?.content || '';

    // Protection against content regression
    const finalContent = accumulatedContent.length >= currentContent.length
      ? accumulatedContent
      : currentContent;

    // Preserve contentBlockRefs (order tracking for derived contentBlocks)
    const existingContentBlockRefs = currentMessage?.contentBlockRefs;

    handleAssistantMessageChunk(
      currentConversationId,
      currentAssistantMessageId,
      finalContent,
      addMessage,
      updateMessage,
      getMessages,
      existingContentBlockRefs
    );
  };

  // Schedule flush of tool content buffer
  const scheduleToolContentFlush = () => {
    if (!toolContentFlushTimer) {
      toolContentFlushTimer = setTimeout(flushToolContentBuffer, TOOL_CONTENT_FLUSH_INTERVAL);
    }
  };

  // Schedule flush of text content buffer
  const scheduleTextContentFlush = () => {
    pendingTextUpdate = true;
    if (!textContentFlushTimer) {
      textContentFlushTimer = setTimeout(flushTextContentBuffer, TEXT_CONTENT_FLUSH_INTERVAL);
    }
  };

  try {
    while (true) {
      // Check if streaming was aborted
      if (abortSignal?.aborted) {
        break;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete SSE events (separated by \n\n)
      const events = buffer.split('\n\n');
      // Keep the last incomplete event in buffer
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        let eventType: string | null = null;
        let eventData: string | null = null;

        // Parse event block line by line
        const lines = eventBlock.split('\n');
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6).trim();
          }
        }

        // Skip if no data
        if (!eventData || eventData === '{}') {
          // Handle done event even with empty data
          if (eventType === 'done') {
            streamComplete = true;
            break;
          }
          continue;
        }

        try {
          const parsed = JSON.parse(eventData);

          // Handle conversation_created event (only for /api/chat/new)
          if (eventType === 'conversation_created' && parsed.conversation_id) {
            currentConversationId = parsed.conversation_id;
            if (callbacks.onConversationCreated) {
              callbacks.onConversationCreated(parsed.conversation_id, parsed);
            }
            continue;
          }

          // Handle user_message_saved event (only for /api/chat)
          if (eventType === 'user_message_saved' && parsed.user_message_id) {
            if (callbacks.onUserMessageSaved) {
              callbacks.onUserMessageSaved(parsed.user_message_id);
            }
            continue;
          }

          // Handle assistant_message_start event
          if (eventType === 'assistant_message_start' && parsed.message_id) {
            // Check if message already exists (e.g., it has tool calls from previous events)
            const messages = getMessages(currentConversationId);
            const existingMessage = messages.find(m =>
              m.id === parsed.message_id || m.id === currentAssistantMessageId
            );

            currentAssistantMessageId = parsed.message_id;

            if (!existingMessage) {
              // New message - reset accumulator and create message
              accumulatedContent = '';
              assistantMessageCreated = true;
              handleAssistantMessageStart(
                currentConversationId,
                currentAssistantMessageId,
                addMessage,
                setStreamingMessageId
              );
              // Clear sending state - streaming has started
              setIsSending(false);
            } else {
              // Message exists (likely has tool calls) - preserve accumulated content
              assistantMessageCreated = true;
              accumulatedContent = existingMessage.content || '';
              // Update streaming state without recreating the message
              setStreamingMessageId(currentAssistantMessageId);
              // Clear sending state - streaming has started
              setIsSending(false);
            }
            continue;
          }

          // Handle assistant_message_chunk event
          // Uses batching to reduce re-renders - accumulates chunks and flushes every 50ms
          if (eventType === 'assistant_message_chunk' && parsed.content !== undefined) {
            // If assistant message hasn't been created yet (backend didn't send assistant_message_start),
            // create it now with the initial message ID
            if (!assistantMessageCreated) {
              assistantMessageCreated = true;
              handleAssistantMessageStart(
                currentConversationId,
                currentAssistantMessageId,
                addMessage,
                setStreamingMessageId
              );
            }

            const chunkText = extractTextContent(parsed.content);

            // If content is an array, it likely contains the full accumulated content
            // If content is a string, it's an incremental chunk
            if (Array.isArray(parsed.content)) {
              // Use the full content from the array
              accumulatedContent = chunkText;
            } else {
              // Accumulate incremental chunks normally
              // The chunks represent new streaming content that should be added
              accumulatedContent += chunkText;
            }

            // Schedule batched update instead of updating immediately
            // This reduces re-renders from potentially 100+/sec to ~20/sec
            scheduleTextContentFlush();
            onChunk?.(chunkText);
            continue;
          }

          // Handle text_block_complete event
          // Emitted when a complete text block has been saved to the database
          if (eventType === 'text_block_complete' && parsed.content !== undefined) {
            // Ensure message exists
            if (!assistantMessageCreated) {
              assistantMessageCreated = true;
              handleAssistantMessageStart(
                currentConversationId,
                currentAssistantMessageId,
                addMessage,
                setStreamingMessageId
              );
            }

            const blockText = extractTextContent(parsed.content);

            // Get current message state to check what's already been processed
            const messages = getMessages(currentConversationId);
            const message = messages.find(m => m.id === currentAssistantMessageId);

            if (message) {
              const currentContent = message.content || '';

              // Check if this exact block text is already in the existing text block refs
              // This prevents duplication when text_block_complete arrives after chunks
              const existingTextRefs = (message.contentBlockRefs || [])
                .filter((ref): ref is { type: 'text'; content: string } => ref.type === 'text');
              const isExactMatchInRefs = existingTextRefs.some(ref => ref.content === blockText);

              // text_block_complete usually arrives AFTER chunks have already updated message.content
              // So we should sync accumulatedContent with currentContent instead of adding blockText
              // This prevents duplication: if chunks already added the text, don't add it again
              if (isExactMatchInRefs) {
                // This block already exists, just sync accumulatedContent
                if (currentContent.length > accumulatedContent.length) {
                  accumulatedContent = currentContent;
                }
              } else if (currentContent.includes(blockText)) {
                // Block text is already in currentContent (via chunks), sync accumulatedContent
                if (currentContent.length > accumulatedContent.length) {
                  accumulatedContent = currentContent;
                }
              } else {
                // New block text not yet in content (rare case where text_block_complete arrives first)
                // Add it to accumulatedContent
                accumulatedContent += blockText;
              }

              // Add text block ref to maintain correct order (text1, tool_call, text2, etc.)
              // Use appendTextBlockRef for immutable update
              const updatedContentBlockRefs = appendTextBlockRef(message.contentBlockRefs, blockText);

              // Update message with accumulated content and contentBlockRefs
              // Use the longer of accumulatedContent or currentContent to prevent regression
              const finalContent = accumulatedContent.length >= currentContent.length
                ? accumulatedContent
                : currentContent;

              // Update accumulatedContent to match final content
              accumulatedContent = finalContent;

              updateMessage(currentConversationId, currentAssistantMessageId, {
                content: finalContent,
                contentBlockRefs: updatedContentBlockRefs,
                isStreaming: true,
              });
            }

            continue;
          }

          // Handle assistant_message_complete event
          // Backend sends: { message_id, full_content } or { content }
          const completeContent = parsed.full_content ?? parsed.content;
          if (eventType === 'assistant_message_complete' && completeContent !== undefined) {
            // Ensure message exists before completing
            if (!assistantMessageCreated) {
              assistantMessageCreated = true;
              handleAssistantMessageStart(
                currentConversationId,
                currentAssistantMessageId,
                addMessage,
                setStreamingMessageId
              );
            }

            const completeText = extractTextContent(completeContent);

            // If backend provided a different message ID, update the existing message's ID first
            if (parsed.message_id && parsed.message_id !== currentAssistantMessageId) {
              // Update the message ID in the store before completing
              const messages = getMessages(currentConversationId);
              const existingMessage = messages.find(m => m.id === currentAssistantMessageId);
              if (existingMessage) {
                // Update the message with new ID and final content
                updateMessage(currentConversationId, currentAssistantMessageId, {
                  id: parsed.message_id,
                  content: completeText,
                  isStreaming: false,
                });
                currentAssistantMessageId = parsed.message_id;
              }
            } else {
              // Same ID, just update content and streaming status
              handleAssistantMessageComplete(
                currentConversationId,
                currentAssistantMessageId,
                completeText,
                updateMessage,
                getMessages
              );
            }

            accumulatedContent = completeText;
            continue;
          }

          // Handle tool_call_start event
          if (eventType === 'tool_call_start') {
            // Ensure assistant message exists
            if (!assistantMessageCreated) {
              assistantMessageCreated = true;
              handleAssistantMessageStart(
                currentConversationId,
                currentAssistantMessageId,
                addMessage,
                setStreamingMessageId
              );
            }

            if (parsed.tool_name) {
              // addToolCallToMessage now automatically adds tool call ref to contentBlockRefs
              // No need to manually update contentBlocks - they are derived at render time
              handleToolCallStart(
                currentConversationId,
                currentAssistantMessageId,
                parsed.tool_name,
                parsed.call_id,
                parsed.arguments || {},
                addToolCallToMessage
              );
            }
            continue;
          }

          // Handle tool_call_execution event
          if (eventType === 'tool_call_execution') {
            if (parsed.tool_name) {
              handleToolCallExecution(
                currentConversationId,
                currentAssistantMessageId,
                parsed.tool_name,
                parsed.call_id,
                updateToolCall,
                getMessages
              );
            }
            continue;
          }

          // Handle tool_content_chunk event (streaming content during tool execution)
          // Uses batching to reduce re-renders - accumulates chunks and flushes every 100ms
          if (eventType === 'tool_content_chunk') {
            if (parsed.tool_name && parsed.content) {
              const bufferKey = parsed.call_id || parsed.tool_name;
              const existing = toolContentBuffer.get(bufferKey);
              if (existing) {
                existing.content += parsed.content;
              } else {
                toolContentBuffer.set(bufferKey, {
                  toolName: parsed.tool_name,
                  callId: parsed.call_id,
                  content: parsed.content,
                });
              }
              scheduleToolContentFlush();
            }
            continue;
          }

          // Handle tool_call_complete event
          // Note: Interrupt detection via error field is DEPRECATED
          // Interrupts now come as separate SSE events (clarification_needed, plan_awaiting_approval)
          if (eventType === 'tool_call_complete') {
            // Flush any pending tool content before completing
            flushToolContentBuffer();

            if (parsed.tool_name) {
              handleToolCallComplete(
                currentConversationId,
                currentAssistantMessageId,
                parsed.tool_name,
                parsed.call_id,
                parsed.result || '',
                parsed.success ?? false,
                parsed.execution_time ?? null,
                parsed.error ?? null,
                completeToolCall,
                getMessages
              );

              // Handle presentation generation tools (generate_presentation, approve_plan)
              // These tools return gamma_result with the final presentation
              if (isPresentationGenerationTool(parsed.tool_name) && parsed.result) {
                const toolResult = parsePlanningToolResult(parsed.result);
                if (toolResult.success && toolResult.gamma_result) {
                  const { updateActivePlanStatus, updateActivePlanPresentation } = useChatStore.getState();

                  // Update plan status to executed
                  updateActivePlanStatus('executed', toolResult.message || 'Apresentação gerada com sucesso!');

                  // Extract presentation files and URL from gamma_result
                  const gammaResult = toolResult.gamma_result;
                  const presentationUrl = gammaResult.presentation_url || null;

                  // Normalize files to legacy format for backward compatibility
                  // Handles both new format (url, filename, size) and legacy (storage_path, signed_url, size_bytes)
                  const normalizedFiles = normalizePresentationFiles(gammaResult.files as Parameters<typeof normalizePresentationFiles>[0]);
                  if (normalizedFiles) {
                    updateActivePlanPresentation(normalizedFiles, presentationUrl);
                  }
                }
              }
            }
            continue;
          }

          // Handle done event
          if (eventType === 'done') {
            streamComplete = true;
            break;
          }

          // Handle error event
          if (eventType === 'error') {
            const errorMessage = parsed.error || 'An error occurred during streaming';
            console.error('SSE Error:', errorMessage);

            // Update message with error if we have an active message
            if (currentConversationId && currentAssistantMessageId) {
              updateMessage(currentConversationId, currentAssistantMessageId, {
                content: accumulatedContent || `Erro: ${errorMessage}`,
                isStreaming: false,
              });
            }

            setStreamingMessageId(null);
            throw new Error(errorMessage);
          }

          // Handle plan_awaiting_approval event (LangGraph interrupt pattern)
          // New architecture (2026): This event now comes from request_plan_approval tool
          // (not from create_plan or edit_plan which don't trigger interrupts anymore)
          // The event is emitted when the backend pauses for user approval
          if (eventType === 'plan_awaiting_approval') {
            completeRunningToolCallForInterrupt(
              currentConversationId,
              currentAssistantMessageId,
              INTERRUPT_MESSAGES.PLAN_APPROVAL,
              getMessages,
              completeToolCall
            );

            const { setActivePlan, setActiveInterrupt } = useChatStore.getState();
            setupPlanApprovalInterrupt(parsed, currentConversationId, setActivePlan, setActiveInterrupt);

            continue;
          }

          // Handle clarification_needed event (LangGraph interrupt pattern)
          // This event is emitted when the agent needs more information from the user
          if (eventType === 'clarification_needed') {
            completeRunningToolCallForInterrupt(
              currentConversationId,
              currentAssistantMessageId,
              INTERRUPT_MESSAGES.CLARIFICATION,
              getMessages,
              completeToolCall
            );

            const { setActiveInterrupt } = useChatStore.getState();
            setupClarificationInterrupt(parsed, currentConversationId, setActiveInterrupt);

            continue;
          }

          // Handle generic interrupt event (fallback for other interrupt types)
          // This provides forward compatibility for new interrupt types
          if (eventType === 'interrupt') {
            const { setActiveInterrupt, setActivePlan } = useChatStore.getState();
            const interruptType = parsed.type as 'clarification_questions' | 'plan_approval';

            if (interruptType === 'clarification_questions') {
              completeRunningToolCallForInterrupt(
                currentConversationId,
                currentAssistantMessageId,
                INTERRUPT_MESSAGES.CLARIFICATION,
                getMessages,
                completeToolCall
              );
              setupClarificationInterrupt(parsed, currentConversationId, setActiveInterrupt);
            } else if (interruptType === 'plan_approval') {
              completeRunningToolCallForInterrupt(
                currentConversationId,
                currentAssistantMessageId,
                INTERRUPT_MESSAGES.PLAN_APPROVAL,
                getMessages,
                completeToolCall
              );
              setupPlanApprovalInterrupt(parsed, currentConversationId, setActivePlan, setActiveInterrupt);
            } else {
              console.warn('Unknown interrupt type received:', interruptType, parsed);
            }
            continue;
          }
        } catch (e) {
          console.error('Failed to parse SSE event:', e, 'Event type:', eventType, 'Data:', eventData);
          // Don't break the stream on parse errors, just log and continue
        }
      }

      // Break if done event was received
      if (streamComplete) {
        break;
      }
    }
  } catch (error) {
    console.error('Error processing SSE stream:', error);
    // Update message with error if we have an active message
    if (currentConversationId && currentAssistantMessageId) {
      updateMessage(currentConversationId, currentAssistantMessageId, {
        content: accumulatedContent || 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        isStreaming: false,
      });
    }
    throw error;
  } finally {
    // Clean up tool content buffer timer
    if (toolContentFlushTimer) {
      clearTimeout(toolContentFlushTimer);
      toolContentFlushTimer = null;
    }
    // Flush any remaining tool content
    flushToolContentBuffer();

    // Clean up text content buffer timer
    if (textContentFlushTimer) {
      clearTimeout(textContentFlushTimer);
      textContentFlushTimer = null;
    }
    // Flush any remaining text content
    flushTextContentBuffer();

    // Ensure streaming and sending states are cleared
    if (currentConversationId && currentAssistantMessageId) {
      updateMessage(currentConversationId, currentAssistantMessageId, {
        isStreaming: false,
      });
    }
    setStreamingMessageId(null);
    setIsSending(false);
  }
}

/**
 * Creates initial assistant message when streaming starts
 */
function handleAssistantMessageStart(
  conversationId: string,
  messageId: string,
  addMessage: (conversationId: string, message: Message) => void,
  setStreamingMessageId: (id: string | null) => void
): void {
  const assistantMessage: Message = {
    id: messageId,
    role: 'assistant',
    content: '',
    timestamp: new Date(),
    conversationId,
    isStreaming: true,
    messageType: 'text',
  };
  addMessage(conversationId, assistantMessage);
  setStreamingMessageId(messageId);
}

/**
 * Updates assistant message with accumulated content during streaming
 * Creates the message if it doesn't exist yet
 * Preserves contentBlockRefs to maintain tool calls and text blocks order
 */
function handleAssistantMessageChunk(
  conversationId: string,
  messageId: string,
  content: string,
  addMessage: (conversationId: string, message: Message) => void,
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void,
  getMessages: (conversationId: string) => Message[],
  preserveContentBlockRefs?: ContentBlockRef[] | undefined
): void {
  const messages = getMessages(conversationId);
  const messageExists = messages.some((msg) => msg.id === messageId);

  if (!messageExists) {
    // Create the message if it doesn't exist
    const assistantMessage: Message = {
      id: messageId,
      role: 'assistant',
      content,
      timestamp: new Date(),
      conversationId,
      isStreaming: true,
      messageType: 'text',
    };
    addMessage(conversationId, assistantMessage);
  } else {
    // Update existing message - preserve contentBlockRefs if they exist
    // This is critical for streaming text to display correctly after tool calls
    const updatePayload: Partial<Message> = {
      content,
      isStreaming: true,
    };

    // Preserve contentBlockRefs if provided or if they exist in the current message
    if (preserveContentBlockRefs) {
      updatePayload.contentBlockRefs = preserveContentBlockRefs;
    } else {
      const existingMessage = messages.find((msg) => msg.id === messageId);
      if (existingMessage?.contentBlockRefs) {
        updatePayload.contentBlockRefs = existingMessage.contentBlockRefs;
      }
    }

    updateMessage(conversationId, messageId, updatePayload);
  }
}

/**
 * Finalizes assistant message when streaming completes
 */
function handleAssistantMessageComplete(
  conversationId: string,
  messageId: string,
  content: string,
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void,
  getMessages: (conversationId: string) => Message[]
): void {
  const messages = getMessages(conversationId);
  const messageExists = messages.some((msg) => msg.id === messageId);

  if (!messageExists) {
    // This shouldn't happen if chunks were processed, but handle it gracefully
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Message ${messageId} not found when completing, creating it now`);
    }
    const { addMessage } = useChatStore.getState();
    const assistantMessage: Message = {
      id: messageId,
      role: 'assistant',
      content,
      timestamp: new Date(),
      conversationId,
      isStreaming: false,
      messageType: 'text',
    };
    addMessage(conversationId, assistantMessage);
  } else {
    updateMessage(conversationId, messageId, {
      content,
      isStreaming: false,
    });
  }
}

/**
 * Handles tool_call_start event - creates a new tool call in the message
 */
function handleToolCallStart(
  conversationId: string,
  messageId: string,
  toolName: string,
  callId: string | null,
  args: Record<string, unknown>,
  addToolCallToMessage: (conversationId: string, messageId: string, toolCallId: string, toolName: string, args: Record<string, unknown>) => void
): void {
  // Use call_id if available, otherwise generate one with tool name + timestamp
  const toolCallId = callId || `${toolName}-${Date.now()}`;

  addToolCallToMessage(conversationId, messageId, toolCallId, toolName, args);
}

/**
 * Handles tool_call_execution event - updates tool call status to running
 */
function handleToolCallExecution(
  conversationId: string,
  messageId: string,
  toolName: string,
  callId: string | null,
  updateToolCall: (conversationId: string, messageId: string, toolCallId: string, status: 'running') => void,
  getMessages: (conversationId: string) => Message[]
): void {
  const messages = getMessages(conversationId);
  const message = messages.find((msg) => msg.id === messageId);

  if (!message || !message.toolCalls) return;

  // Find tool call by call_id or tool_name
  const toolCall = message.toolCalls.find(tc =>
    callId ? tc.id === callId : tc.tool_name === toolName
  );

  if (toolCall) {
    updateToolCall(conversationId, messageId, toolCall.id, 'running');
  }
}

/**
 * Handles tool_content_chunk event - appends streaming content to tool call
 */
function handleToolContentChunk(
  conversationId: string,
  messageId: string,
  toolName: string,
  callId: string | null,
  content: string,
  updateToolCallStreamingContent: (conversationId: string, messageId: string, toolCallId: string, content: string) => void,
  getMessages: (conversationId: string) => Message[]
): void {
  const messages = getMessages(conversationId);
  const message = messages.find((msg) => msg.id === messageId);

  if (!message || !message.toolCalls) return;

  // Find tool call by call_id or tool_name
  const toolCall = message.toolCalls.find(tc =>
    callId ? tc.id === callId : tc.tool_name === toolName
  );

  if (toolCall) {
    updateToolCallStreamingContent(conversationId, messageId, toolCall.id, content);
  }
}

/**
 * Handles tool_call_complete event - finalizes tool call with result
 */
function handleToolCallComplete(
  conversationId: string,
  messageId: string,
  toolName: string,
  callId: string | null,
  result: string,
  success: boolean,
  executionTime: number | null,
  error: string | null,
  completeToolCall: (
    conversationId: string,
    messageId: string,
    toolCallId: string,
    result: string,
    success: boolean,
    executionTime: number | null,
    error: string | null
  ) => void,
  getMessages: (conversationId: string) => Message[]
): void {
  const messages = getMessages(conversationId);
  const message = messages.find((msg) => msg.id === messageId);

  if (!message || !message.toolCalls) return;

  // Find tool call by call_id or tool_name
  const toolCall = message.toolCalls.find(tc =>
    callId ? tc.id === callId : tc.tool_name === toolName
  );

  if (toolCall) {
    completeToolCall(conversationId, messageId, toolCall.id, result, success, executionTime, error);
  }
}

// ========================================
// Main Hook
// ========================================

export function useChat(conversationId: string | null) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeConversationIdRef = useRef<string | null>(conversationId);

  // Use useShallow to prevent re-renders when unrelated state changes
  // Only re-render when the specific selected values change (shallow comparison)
  const {
    messages,
    currentConversationId,
    setMessages,
    addMessage,
    updateMessage,
    setLoadingMessages,
    streamingMessageId,
    setStreamingMessageId,
    isSending,
    setIsSending,
    setCurrentConversation,
    addConversation,
    updateConversationId,
  } = useChatStore(
    useShallow((state) => ({
      messages: state.messages,
      currentConversationId: state.currentConversationId,
      setMessages: state.setMessages,
      addMessage: state.addMessage,
      updateMessage: state.updateMessage,
      setLoadingMessages: state.setLoadingMessages,
      streamingMessageId: state.streamingMessageId,
      setStreamingMessageId: state.setStreamingMessageId,
      isSending: state.isSending,
      setIsSending: state.setIsSending,
      setCurrentConversation: state.setCurrentConversation,
      addConversation: state.addConversation,
      updateConversationId: state.updateConversationId,
    }))
  );

  // Update ref when conversationId prop changes
  useEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  // Use the active conversation ID (might be updated during streaming)
  const activeId = activeConversationIdRef.current;
  const currentMessages = activeId ? messages[activeId] || [] : [];

  // Fetch messages for a conversation
  // Skip fetching for temp IDs since messages come from streaming
  const { isLoading, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      try {
        const data = await chatApi.getMessages(conversationId);
        setMessages(conversationId, data);
        return data;
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        setLoadingMessages(false);
        throw error;
      }
    },
    enabled: !!conversationId && !conversationId.startsWith('temp-'),
  });

  // Send message with streaming
  const sendMessage = useCallback(
    async (
      content: string,
      attachmentIds?: string[],
      pendingAttachments?: MessageAttachment[],
      onChunk?: (chunk: string) => void
    ): Promise<string | undefined> => {
      if (!content.trim()) return;

      // Set sending state immediately for instant UI feedback
      setIsSending(true);

      // Cancel any ongoing streaming
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const isNewChat = !conversationId;
      let activeConversationId = conversationId;
      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;

      // ========================================
      // NEW CHAT PATH: Optimistic UI with background streaming
      // ========================================
      if (isNewChat) {
        // Generate temporary conversation ID
        const tempConversationId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        activeConversationId = tempConversationId;

        // Create optimistic conversation
        const optimisticConversation: Conversation = {
          id: tempConversationId,
          title: content.slice(0, 50),
          lastMessage: content,
          updatedAt: new Date(),
          createdAt: new Date(),
          userId: '',
          messageCount: 1,
        };
        addConversation(optimisticConversation);

        // Add optimistic user message with attachments
        const optimisticUserMessage: Message = {
          id: userMessageId,
          role: 'user',
          content,
          timestamp: new Date(),
          conversationId: tempConversationId,
          messageType: 'text',
          attachments: pendingAttachments,
        };
        addMessage(tempConversationId, optimisticUserMessage);

        // Update the ref so UI can use the temp ID immediately
        activeConversationIdRef.current = tempConversationId;

        // Process streaming in background (fire-and-forget)
        (async () => {
          try {
            const response = await chatApi.sendNewChatMessage(content, attachmentIds);
            const reader = response.body?.getReader();

            if (!reader) {
              throw new Error('No reader available');
            }

            abortControllerRef.current = new AbortController();

            await processStreamEvents(
              reader,
              tempConversationId,
              assistantMessageId,
              {
                onConversationCreated: (realConversationId, data) => {
                  // Update temp conversation ID to real ID
                  updateConversationId(tempConversationId, realConversationId);

                  // Update conversation with real data from backend
                  const { updateConversation } = useChatStore.getState();
                  updateConversation(realConversationId, {
                    title: data.conversation_title || content.slice(0, 50),
                    updatedAt: new Date(data.created_at),
                    createdAt: new Date(data.created_at),
                  });

                  // Update active conversation ID and ref
                  activeConversationIdRef.current = realConversationId;
                },
              },
              onChunk,
              abortControllerRef.current.signal
            );
          } catch (error) {
            console.error('Error in background streaming:', error);
            setStreamingMessageId(null);
            setIsSending(false);

            // Show error message in assistant bubble
            const { messages: allMessages } = useChatStore.getState();
            const currentConvId = activeConversationIdRef.current;
            if (currentConvId && allMessages[currentConvId]) {
              updateMessage(currentConvId, assistantMessageId, {
                content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
                isStreaming: false,
              });
            }
          }
        })();

        // Return temp ID immediately for navigation
        return tempConversationId;
      }

      // ========================================
      // EXISTING CHAT PATH: Synchronous streaming
      // ========================================
      try {
        // Add user message immediately with attachments
        const userMessage: Message = {
          id: userMessageId,
          role: 'user',
          content,
          timestamp: new Date(),
          conversationId: activeConversationId!,
          messageType: 'text',
          attachments: pendingAttachments,
        };
        addMessage(activeConversationId!, userMessage);

        // Call API endpoint
        const response = await chatApi.sendMessage({
          conversation_id: activeConversationId!,
          message: content,
          attachment_ids: attachmentIds,
        });

        const reader = response.body?.getReader();

        if (!reader) {
          throw new Error('No reader available');
        }

        abortControllerRef.current = new AbortController();

        await processStreamEvents(
          reader,
          activeConversationId!,
          assistantMessageId,
          {
            onUserMessageSaved: (serverMessageId) => {
              // Update temp user message ID with server ID
              const { messages: allMessages } = useChatStore.getState();
              const msgs = allMessages[activeConversationId!] || [];
              const tempUserMsg = msgs.find(m => m.role === 'user' && m.id === userMessageId);
              if (tempUserMsg) {
                updateMessage(activeConversationId!, tempUserMsg.id, { id: serverMessageId });
              }
            },
          },
          onChunk,
          abortControllerRef.current.signal
        );

        return activeConversationId || undefined;
      } catch (error) {
        console.error('Error sending message:', error);
        setStreamingMessageId(null);
        setIsSending(false);

        // Update message with error if we have a conversation
        if (activeConversationId) {
          updateMessage(activeConversationId, assistantMessageId, {
            content: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
            isStreaming: false,
          });
        }

        return activeConversationId || undefined;
      }
    },
    [conversationId, addMessage, updateMessage, setStreamingMessageId, setIsSending, addConversation, updateConversationId]
  );

  const setActiveConversation = useCallback(
    (id: string | null) => {
      setCurrentConversation(id);
    },
    [setCurrentConversation]
  );

  return {
    messages: currentMessages,
    isLoading,
    isStreaming: !!streamingMessageId,
    isSending,
    sendMessage,
    refetchMessages: refetch,
    setActiveConversation,
    currentConversationId,
  };
}
