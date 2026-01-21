/**
 * Hook for managing LangGraph interrupts (human-in-the-loop)
 * Handles both clarification questions and plan approval interrupts
 */

import { useState, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useChatStore } from '@/lib/stores/chatStore';
import { chatApi } from '@/lib/api/chat';
// Note: interruptParser utilities are deprecated - interrupts now come as direct SSE events
// See @/lib/utils/interruptParser.ts for backward compatibility utilities if needed
import type {
  InterruptState,
  InterruptResponse,
  ClarificationQuestionsResponse,
  ClarificationQuestionsData,
} from '@/types/interrupt';
import type { Message, ContentBlockRef } from '@/types/chat';
import { appendTextBlockRef } from '@/lib/utils/contentBlocks';
import {
  completeRunningToolCallForInterrupt,
  setupPlanApprovalInterrupt,
  setupClarificationInterrupt,
  INTERRUPT_MESSAGES,
} from '@/lib/utils/interruptHelpers';
import {
  isPresentationGenerationTool,
  isApprovalRequestTool,
  parsePlanningToolResult,
  normalizePresentationFiles,
} from '@/lib/utils/planningTools';

interface UseInterruptReturn {
  /** Current interrupt state */
  activeInterrupt: InterruptState;
  /** Whether a response is being submitted */
  isSubmitting: boolean;
  /** Submit a response to the active interrupt */
  submitResponse: (response: InterruptResponse) => Promise<void>;
  /** Clear the active interrupt without responding */
  clearInterrupt: () => void;
}

/**
 * Hook to manage interrupt state and actions for LangGraph human-in-the-loop
 *
 * @returns Interrupt state and action handlers
 */
export function useInterrupt(): UseInterruptReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Note: We intentionally don't add cleanup to abort on unmount here.
  // The InterruptCard unmounts after clearActiveInterrupt() is called,
  // but the stream processing continues using store actions.
  // Aborting on unmount would prematurely cancel valid stream processing.

  // Get interrupt state from store using shallow comparison
  const { activeInterrupt, clearActiveInterrupt } = useChatStore(
    useShallow((state) => ({
      activeInterrupt: state.activeInterrupt,
      clearActiveInterrupt: state.clearActiveInterrupt,
    }))
  );

  /**
   * Submit a response to the active interrupt
   * Handles both clarification questions and plan approval
   * Uses different endpoints based on interrupt type
   */
  const submitResponse = useCallback(
    async (response: InterruptResponse) => {
      const { activeInterrupt: currentInterrupt } = useChatStore.getState();

      if (!currentInterrupt.active || !currentInterrupt.conversationId || !currentInterrupt.data) {
        console.warn('No active interrupt to respond to');
        return;
      }

      // Cancel any ongoing resume response streaming
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsSubmitting(true);

      try {
        const conversationId = currentInterrupt.conversationId;

        // Set isSending BEFORE clearing the interrupt
        // This ensures the ThinkingBubble appears immediately and
        // MessageActions (like/dislike) are hidden during processing
        const { setIsSending } = useChatStore.getState();
        setIsSending(true);

        // Both plan approval and clarification questions use the same resume endpoint
        // The resume_data structure is the same for both:
        // - Plan approval: { action: 'approve' | 'comment' | 'reject', feedback?: string }
        // - Clarification: { question_id: answer, ... }
        const apiResponse = await chatApi.resumeWorkflow(conversationId, response);

        const reader = apiResponse.body?.getReader();
        if (!reader) {
          throw new Error('No reader available for resume stream');
        }

        // Clear the interrupt before processing the stream
        // This allows the UI to show the streaming response
        clearActiveInterrupt();

        // Process the SSE stream
        // Both plan approval and clarification use the same stream processor
        // since they both use the /resume endpoint
        await processResumeStream(
          reader,
          conversationId,
          abortControllerRef.current.signal
        );
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Stream was intentionally aborted
          return;
        }
        console.error('Error responding to interrupt:', error);
        // Reset isSending state on error (before stream started)
        const { setIsSending } = useChatStore.getState();
        setIsSending(false);
        // Don't clear interrupt on error so user can retry
      } finally {
        setIsSubmitting(false);
      }
    },
    [clearActiveInterrupt]
  );

  /**
   * Clear the active interrupt without responding
   */
  const clearInterrupt = useCallback(() => {
    clearActiveInterrupt();
  }, [clearActiveInterrupt]);

  return {
    activeInterrupt,
    isSubmitting,
    submitResponse,
    clearInterrupt,
  };
}

/**
 * Process SSE stream from resume endpoint
 * Handles message events and potential new interrupts
 * Continues the existing assistant message flow instead of creating new messages
 */
async function processResumeStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  conversationId: string,
  abortSignal: AbortSignal
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
    completeToolCall,
    setActivePlan,
    setActiveInterrupt,
    updateActivePlanStatus,
    updateActivePlanPresentation,
  } = useChatStore.getState();

  // Helper to get current messages
  const getMessages = (convId: string) => {
    const state = useChatStore.getState();
    return state.messages[convId] || [];
  };

  // Generic resume flow for ANY interrupt type (clarification questions, plan approval, etc.)
  // After an interrupt, the backend sends a new assistant message as the response.
  // We create a NEW message instead of continuing the old one (which had the interrupt tool call).
  // The backend will send the message_id in assistant_message_start or assistant_message_complete.
  let accumulatedContent = '';
  let buffer = '';
  // Start with a temporary ID - will be updated when backend sends the real message_id
  let assistantMessageId = `assistant-resume-${Date.now()}`;
  let assistantMessageCreated = false;
  // Track if streaming is complete to prevent flushTextContentBuffer from overwriting final state
  // This is critical for ALL interrupt types to ensure the final content is preserved
  let streamingComplete = false;

  // Batching state
  let textContentFlushTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingTextUpdate = false;
  const TEXT_CONTENT_FLUSH_INTERVAL = 50;

  const flushTextContentBuffer = () => {
    if (textContentFlushTimer) {
      clearTimeout(textContentFlushTimer);
      textContentFlushTimer = null;
    }

    // Don't flush if streaming is already complete (assistant_message_complete was received)
    // This prevents overwriting the final content with buffered partial content
    if (!pendingTextUpdate || streamingComplete) return;
    pendingTextUpdate = false;

    const messages = getMessages(conversationId);
    const currentMessage = messages.find((m) => m.id === assistantMessageId);
    const currentContent = currentMessage?.content || '';

    const finalContent =
      accumulatedContent.length >= currentContent.length
        ? accumulatedContent
        : currentContent;

    const existingContentBlockRefs = currentMessage?.contentBlockRefs;

    updateMessageContent(
      conversationId,
      assistantMessageId,
      finalContent,
      addMessage,
      updateMessage,
      getMessages,
      existingContentBlockRefs
    );
  };

  const scheduleTextContentFlush = () => {
    pendingTextUpdate = true;
    if (!textContentFlushTimer) {
      textContentFlushTimer = setTimeout(flushTextContentBuffer, TEXT_CONTENT_FLUSH_INTERVAL);
    }
  };

  try {
    while (true) {
      if (abortSignal.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const eventBlock of events) {
        if (!eventBlock.trim()) continue;

        let eventType: string | null = null;
        let eventData: string | null = null;

        const lines = eventBlock.split('\n');
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6).trim();
          }
        }

        if (!eventData || eventData === '{}') {
          if (eventType === 'done') break;
          continue;
        }

        try {
          const parsed = JSON.parse(eventData);

          // Handle workflow_resumed event - indicates the workflow has resumed
          // May contain the message_id to continue
          if (eventType === 'workflow_resumed') {
            if (parsed.message_id) {
              assistantMessageId = parsed.message_id;
            }
            // Mark the existing message as streaming
            if (assistantMessageCreated) {
              setStreamingMessageId(assistantMessageId);
              updateMessage(conversationId, assistantMessageId, {
                isStreaming: true,
              });
            }
            // Note: Don't reset isSending here - keep it true until streaming actually starts
            // This prevents a brief flash of the input being enabled between interrupt clear
            // and first streaming content. The finally block will reset it when stream ends.
            continue;
          }

          // Handle assistant_message_start
          // If we already have a message from the conversation, update the ID
          if (eventType === 'assistant_message_start' && parsed.message_id) {
            // Check if we should use the backend's message ID
            const existingMessages = getMessages(conversationId);
            const existingMessage = existingMessages.find(
              (m) => m.id === assistantMessageId || m.id === parsed.message_id
            );

            if (existingMessage) {
              // Continue with existing message
              assistantMessageId = existingMessage.id;
              assistantMessageCreated = true;
              accumulatedContent = existingMessage.content || '';
              setStreamingMessageId(assistantMessageId);
              updateMessage(conversationId, assistantMessageId, {
                isStreaming: true,
              });
            } else if (!assistantMessageCreated) {
              // Create new message only if none exists
              assistantMessageId = parsed.message_id;
              accumulatedContent = '';
              assistantMessageCreated = true;
              const message: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                conversationId,
                isStreaming: true,
                messageType: 'text',
              };
              addMessage(conversationId, message);
              setStreamingMessageId(assistantMessageId);
            }
            // Note: Don't reset isSending here - same reasoning as workflow_resumed.
            // The finally block handles cleanup when the stream ends.
            continue;
          }

          // Handle assistant_message_chunk
          if (eventType === 'assistant_message_chunk' && parsed.content !== undefined) {
            if (!assistantMessageCreated) {
              // Create new message for the resume response
              // Don't try to continue the old message (which had the interrupt tool call)
              assistantMessageCreated = true;
              const message: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                conversationId,
                isStreaming: true,
                messageType: 'text',
              };
              addMessage(conversationId, message);
            }

            // Always set streaming message ID when text chunks arrive
            // Critical: when text comes AFTER tool calls, the message already exists
            // but setStreamingMessageId was never called, so the UI doesn't show the text
            setStreamingMessageId(assistantMessageId);

            const chunkText = extractTextContent(parsed.content);
            if (Array.isArray(parsed.content)) {
              accumulatedContent = chunkText;
            } else {
              accumulatedContent += chunkText;
            }
            scheduleTextContentFlush();
            continue;
          }

          // Handle text_block_complete event
          // This is critical for showing text AFTER tool calls complete
          // Without this, the text only exists in message.content but not in contentBlockRefs
          // So when isStreaming becomes false, the text won't be rendered
          if (eventType === 'text_block_complete' && parsed.content !== undefined) {
            const blockText = extractTextContent(parsed.content);

            const messages = getMessages(conversationId);
            const message = messages.find(m => m.id === assistantMessageId);

            if (message) {
              const currentContent = message.content || '';

              // Check if this exact block text is already in the existing text block refs
              const existingTextRefs = (message.contentBlockRefs || [])
                .filter((ref): ref is { type: 'text'; content: string } => ref.type === 'text');
              const isExactMatchInRefs = existingTextRefs.some(ref => ref.content === blockText);

              // Sync accumulatedContent if needed
              if (isExactMatchInRefs || currentContent.includes(blockText)) {
                if (currentContent.length > accumulatedContent.length) {
                  accumulatedContent = currentContent;
                }
              } else {
                accumulatedContent += blockText;
              }

              // Add text block ref to maintain correct order
              const updatedContentBlockRefs = appendTextBlockRef(message.contentBlockRefs, blockText);

              // Update message with contentBlockRefs
              const finalContent = accumulatedContent.length >= currentContent.length
                ? accumulatedContent
                : currentContent;

              accumulatedContent = finalContent;

              updateMessage(conversationId, assistantMessageId, {
                content: finalContent,
                contentBlockRefs: updatedContentBlockRefs,
                isStreaming: true,
              });
            }

            continue;
          }

          // Handle assistant_message_complete
          if (eventType === 'assistant_message_complete') {
            // Mark streaming as complete to prevent flushTextContentBuffer from overwriting
            streamingComplete = true;

            const completeText = extractTextContent(parsed.full_content ?? parsed.content ?? '');

            // Ensure message exists before completing (like useChat.ts)
            if (!assistantMessageCreated) {
              assistantMessageCreated = true;
              // Use backend message_id if provided, otherwise use temporary ID
              if (parsed.message_id) {
                assistantMessageId = parsed.message_id;
              }
              const message: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                conversationId,
                isStreaming: true,
                messageType: 'text',
              };
              addMessage(conversationId, message);
              setStreamingMessageId(assistantMessageId);
            }

            // If backend sent a different message_id, update the local message ID
            if (parsed.message_id && parsed.message_id !== assistantMessageId) {
              const messages = getMessages(conversationId);
              const existingMessage = messages.find(m => m.id === assistantMessageId);
              if (existingMessage) {
                // Update the existing message with the new ID from backend
                updateMessage(conversationId, assistantMessageId, {
                  id: parsed.message_id,
                  content: completeText,
                  isStreaming: false,
                });
                assistantMessageId = parsed.message_id;
              }
            } else {
              // Same ID, just update content and streaming status
              updateMessage(conversationId, assistantMessageId, {
                content: completeText,
                isStreaming: false,
              });
            }

            // Update accumulatedContent to match final content
            accumulatedContent = completeText;

            // DON'T call setStreamingMessageId(null) here - let finally block handle it
            continue;
          }

          // Handle tool_call_start
          if (eventType === 'tool_call_start' && parsed.tool_name) {
            // Skip tool_call_start for approval request tools during resume
            // These tools were already completed in the original stream with "Aguardando aprovação..."
            // The backend sends them again during resume, but we don't want duplicate tool calls
            if (isApprovalRequestTool(parsed.tool_name)) {
              continue;
            }

            if (!assistantMessageCreated) {
              // Create new message for the resume response
              assistantMessageCreated = true;
              const message: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date(),
                conversationId,
                isStreaming: true,
                messageType: 'text',
              };
              addMessage(conversationId, message);
              setStreamingMessageId(assistantMessageId);
            }

            const toolCallId = parsed.call_id || `${parsed.tool_name}-${Date.now()}`;
            // addToolCallToMessage now automatically adds tool call ref to contentBlockRefs
            // No need to manually update contentBlocks - they are derived at render time
            addToolCallToMessage(
              conversationId,
              assistantMessageId,
              toolCallId,
              parsed.tool_name,
              parsed.arguments || {}
            );
            continue;
          }

          // Handle tool_call_execution
          if (eventType === 'tool_call_execution' && parsed.tool_name) {
            // Skip for approval request tools (already completed in original stream)
            if (isApprovalRequestTool(parsed.tool_name)) {
              continue;
            }

            const messages = getMessages(conversationId);
            const message = messages.find((m) => m.id === assistantMessageId);
            const toolCall = message?.toolCalls?.find(
              (tc) => (parsed.call_id ? tc.id === parsed.call_id : tc.tool_name === parsed.tool_name)
            );
            if (toolCall) {
              updateToolCall(conversationId, assistantMessageId, toolCall.id, 'running');
            }
            continue;
          }

          // Handle tool_content_chunk
          if (eventType === 'tool_content_chunk' && parsed.tool_name && parsed.content) {
            // Skip for approval request tools (already completed in original stream)
            if (isApprovalRequestTool(parsed.tool_name)) {
              continue;
            }

            const messages = getMessages(conversationId);
            const message = messages.find((m) => m.id === assistantMessageId);
            const toolCall = message?.toolCalls?.find(
              (tc) => (parsed.call_id ? tc.id === parsed.call_id : tc.tool_name === parsed.tool_name)
            );
            if (toolCall) {
              updateToolCallStreamingContent(
                conversationId,
                assistantMessageId,
                toolCall.id,
                parsed.content
              );
            }
            continue;
          }

          // Handle tool_call_complete
          // Note: Interrupt detection via error field is DEPRECATED
          // Interrupts now come as separate SSE events (clarification_needed, plan_awaiting_approval)
          if (eventType === 'tool_call_complete' && parsed.tool_name) {
            // Skip for approval request tools (already completed in original stream)
            if (isApprovalRequestTool(parsed.tool_name)) {
              continue;
            }

            const messages = getMessages(conversationId);
            const message = messages.find((m) => m.id === assistantMessageId);
            const toolCall = message?.toolCalls?.find(
              (tc) => (parsed.call_id ? tc.id === parsed.call_id : tc.tool_name === parsed.tool_name)
            );
            if (toolCall) {
              completeToolCall(
                conversationId,
                assistantMessageId,
                toolCall.id,
                parsed.result || '',
                parsed.success ?? false,
                parsed.execution_time ?? null,
                parsed.error ?? null
              );
            }

            // Handle presentation generation tools (generate_presentation, approve_plan)
            // These tools return gamma_result with the final presentation
            if (isPresentationGenerationTool(parsed.tool_name) && parsed.result) {
              const toolResult = parsePlanningToolResult(parsed.result);
              if (toolResult.success && toolResult.gamma_result) {
                // Update plan status to executed
                updateActivePlanStatus('executed', toolResult.message || 'Apresentação gerada com sucesso!');

                // Extract presentation files and URL from gamma_result
                const gammaResult = toolResult.gamma_result;
                const presentationUrl = gammaResult.presentation_url || null;

                // Normalize files to legacy format for backward compatibility
                const normalizedFiles = normalizePresentationFiles(
                  gammaResult.files as Parameters<typeof normalizePresentationFiles>[0]
                );
                if (normalizedFiles) {
                  updateActivePlanPresentation(normalizedFiles, presentationUrl);
                }
              }
            }
            continue;
          }

          // ================================================================
          // PLAN-SPECIFIC EVENTS (only emitted during plan approval flow)
          // These events update the activePlan state to show workflow progress.
          // They are in addition to the generic message/tool events above.
          // ================================================================

          // Handle plan_processing - plan is being processed after user action
          if (eventType === 'plan_processing') {
            updateActivePlanStatus('processing', parsed.message || 'Processando plano...');
            continue;
          }

          // Handle plan_generating - new plan version is being generated (comment flow)
          if (eventType === 'plan_generating') {
            const version = parsed.version || 'nova';
            updateActivePlanStatus('generating', `Gerando plano v${version}...`);
            continue;
          }

          // Handle presentation_generating - presentation is being created via Gamma API
          if (eventType === 'presentation_generating') {
            updateActivePlanStatus('executing', parsed.message || 'Gerando apresentação...');
            continue;
          }

          // Handle presentation_complete - presentation is ready
          if (eventType === 'presentation_complete') {
            updateActivePlanStatus('executed', parsed.message || 'Apresentação gerada com sucesso!');

            if (parsed.gamma_result) {
              const gammaResult = parsed.gamma_result;
              const presentationUrl = gammaResult.presentation_url || null;

              const normalizedFiles = normalizePresentationFiles(
                gammaResult.files as Parameters<typeof normalizePresentationFiles>[0]
              );
              if (normalizedFiles) {
                updateActivePlanPresentation(normalizedFiles, presentationUrl);
              }
            }
            continue;
          }

          // ================================================================
          // INTERRUPT EVENTS (generic for any interrupt type)
          // These events trigger new interrupts during the workflow.
          // ================================================================

          // Handle plan_awaiting_approval interrupt
          // Backend contract: call_id is REQUIRED and always present
          if (eventType === 'plan_awaiting_approval') {
            completeRunningToolCallForInterrupt(
              conversationId,
              assistantMessageId,
              INTERRUPT_MESSAGES.PLAN_APPROVAL,
              getMessages,
              completeToolCall,
              parsed.call_id, // REQUIRED: Backend always sends this
              'request_plan_approval' // Fallback only
            );
            setupPlanApprovalInterrupt(parsed, conversationId, setActivePlan, setActiveInterrupt);
            continue;
          }

          // Handle clarification_needed event (LangGraph interrupt pattern)
          // Backend contract: call_id is REQUIRED and always present
          if (eventType === 'clarification_needed') {
            completeRunningToolCallForInterrupt(
              conversationId,
              assistantMessageId,
              INTERRUPT_MESSAGES.CLARIFICATION,
              getMessages,
              completeToolCall,
              parsed.call_id, // REQUIRED: Backend always sends this
              'ask_clarifying_questions' // Fallback only
            );
            setupClarificationInterrupt(parsed, conversationId, setActiveInterrupt);
            continue;
          }

          // Handle generic interrupt event (fallback for other interrupt types)
          // This provides forward compatibility for new interrupt types
          if (eventType === 'interrupt') {
            const interruptType = parsed.type as 'clarification_questions' | 'plan_approval';

            if (interruptType === 'clarification_questions') {
              completeRunningToolCallForInterrupt(
                conversationId,
                assistantMessageId,
                INTERRUPT_MESSAGES.CLARIFICATION,
                getMessages,
                completeToolCall,
                parsed.call_id, // REQUIRED: Backend always sends this
                'ask_clarifying_questions' // Fallback only
              );
              setupClarificationInterrupt(parsed, conversationId, setActiveInterrupt);
            } else if (interruptType === 'plan_approval') {
              completeRunningToolCallForInterrupt(
                conversationId,
                assistantMessageId,
                INTERRUPT_MESSAGES.PLAN_APPROVAL,
                getMessages,
                completeToolCall,
                parsed.call_id, // REQUIRED: Backend always sends this
                'request_plan_approval' // Fallback only
              );
              setupPlanApprovalInterrupt(parsed, conversationId, setActivePlan, setActiveInterrupt);
            } else {
              console.warn('Unknown interrupt type in resume stream:', interruptType, parsed);
            }
            continue;
          }

          // Handle done
          if (eventType === 'done') {
            break;
          }

          // Handle error
          if (eventType === 'error') {
            console.error('SSE Error during resume:', parsed.error);
            throw new Error(parsed.error || 'Error during resume');
          }
        } catch (e) {
          console.error('Failed to parse resume SSE event:', e, eventData);
        }
      }
    }
  } finally {
    if (textContentFlushTimer) {
      clearTimeout(textContentFlushTimer);
    }
    flushTextContentBuffer();

    // Ensure streaming state is cleared on the message (like useChat.ts)
    // This prevents the green line from persisting if stream ends abnormally
    if (assistantMessageCreated) {
      updateMessage(conversationId, assistantMessageId, {
        isStreaming: false,
      });
    }

    setStreamingMessageId(null);
    setIsSending(false);
  }
}

/**
 * Extract text content from content array or string
 */
function extractTextContent(
  content: string | Array<{ text: string; type: string; index: number }>
): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .sort((a, b) => a.index - b.index)
      .map((item) => item.text)
      .join('');
  }
  return '';
}

/**
 * Update message content (helper function)
 */
function updateMessageContent(
  conversationId: string,
  messageId: string,
  content: string,
  addMessage: (conversationId: string, message: Message) => void,
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void,
  getMessages: (conversationId: string) => Message[],
  preserveContentBlockRefs?: ContentBlockRef[]
): void {
  const messages = getMessages(conversationId);
  const messageExists = messages.some((msg) => msg.id === messageId);

  if (!messageExists) {
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
 * Get default values for clarification questions
 * Initializes response object with default values for each question
 */
export function getDefaultResponses(
  data: ClarificationQuestionsData
): ClarificationQuestionsResponse {
  const defaults: ClarificationQuestionsResponse = {};

  for (const question of data.questions) {
    if (question.default_value !== undefined) {
      if (question.type === 'slider') {
        defaults[question.id] = parseInt(question.default_value, 10);
      } else if (question.type === 'multi_select') {
        defaults[question.id] = [question.default_value];
      } else {
        defaults[question.id] = question.default_value;
      }
    }
  }

  return defaults;
}

// Note: processPlanResponseStream was removed in favor of using processResumeStream
// for both plan approval and clarification questions. The /resume endpoint is now
// the unified endpoint for all interrupt responses.
