/**
 * Hook for managing planning tools state and actions
 *
 * New architecture (2026):
 * - Uses /api/chat/{conversation_id}/resume instead of /api/plans/{plan_id}/respond
 * - Uses conversationId from activeInterrupt instead of threadId from activePlan
 * - Stream processing is delegated to useInterrupt's processResumeStream
 */

import { useState, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { chatApi } from '@/lib/api/chat';
import { useChatStore } from '@/lib/stores/chatStore';
import { buildReviewMessage } from '@/lib/utils/planningTools';
import type { PlanningToolResult, ApprovalAction, ActivePlanState } from '@/types/planning';
import type { PlanApprovalResponse, InterruptType, InterruptData } from '@/types/interrupt';
import {
  isPresentationGenerationTool,
  parsePlanningToolResult,
  normalizePresentationFiles,
} from '@/lib/utils/planningTools';
import {
  completeRunningToolCallForInterrupt,
  setupPlanApprovalInterrupt,
  INTERRUPT_MESSAGES,
} from '@/lib/utils/interruptHelpers';
import { appendTextBlockRef } from '@/lib/utils/contentBlocks';
import type { Message, ContentBlockRef } from '@/types/chat';

interface UsePlanningToolsReturn {
  plans: Map<string, PlanningToolResult>;
  activePlan: ActivePlanState | null;
  isPlanApprovalInProgress: boolean;
  handleToolResult: (toolName: string, result: PlanningToolResult) => void;
  submitPlanAction: (
    action: ApprovalAction,
    planId: string,
    feedback?: string,
    updatedMarkdown?: string
  ) => Promise<void>;
}

/**
 * Hook to manage planning tools state and actions
 *
 * New architecture (2026):
 * - conversationId comes from activeInterrupt, not threadId from activePlan
 * - Uses resumeWorkflow instead of respondToPlan
 * - Stream processing uses same pattern as useInterrupt
 *
 * @param conversationId - Current conversation ID (fallback if activeInterrupt doesn't have one)
 * @param sendMessage - Function to send messages to the agent (used for legacy fallback)
 * @returns Planning tools state and action handlers
 */
export function usePlanningTools(
  conversationId: string | null,
  sendMessage?: (message: string) => Promise<void>
): UsePlanningToolsReturn {
  const [plans, setPlans] = useState<Map<string, PlanningToolResult>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get planning state from store using shallow comparison
  // Note: activeInterrupt is accessed via getState() in submitPlanAction for fresh value
  const { activePlan, isPlanApprovalInProgress } = useChatStore(
    useShallow((state) => ({
      activePlan: state.activePlan,
      isPlanApprovalInProgress: state.isPlanApprovalInProgress,
    }))
  );

  const handleToolResult = useCallback(
    (_toolName: string, result: PlanningToolResult) => {
      if (result.plan_id) {
        setPlans((prev) => {
          const updated = new Map(prev);
          updated.set(result.plan_id!, result);
          return updated;
        });
      }
    },
    []
  );

  const submitPlanAction = useCallback(
    async (
      action: ApprovalAction,
      planId: string,
      feedback?: string,
      _updatedMarkdown?: string
    ) => {
      const {
        activeInterrupt: currentInterrupt,
        setPlanApprovalInProgress,
        updateActivePlanStatus,
        updateActivePlanPresentation,
        setActivePlan,
        setActiveInterrupt,
        clearActiveInterrupt,
        clearActivePlan,
        addMessage,
        updateMessage,
        setStreamingMessageId,
        setIsSending,
        addToolCallToMessage,
        updateToolCall,
        updateToolCallStreamingContent,
        completeToolCall,
      } = useChatStore.getState();

      // Get conversationId from activeInterrupt (new architecture) or fallback to prop
      const effectiveConversationId = currentInterrupt?.conversationId || conversationId;

      // If no conversationId, fall back to legacy message-based flow
      if (!effectiveConversationId) {
        console.warn('No conversationId available for plan action, falling back to legacy flow');
        if (sendMessage) {
          const message = buildReviewMessage(action, planId, feedback, _updatedMarkdown);
          await sendMessage(message);
        } else {
          console.error('No sendMessage function available for legacy fallback');
        }
        return;
      }

      // Cancel any ongoing plan response streaming
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setPlanApprovalInProgress(true);
      updateActivePlanStatus('processing');

      try {
        // Map action to API format
        const apiAction: PlanApprovalResponse['action'] =
          action === 'approved' ? 'approve' :
          action === 'rejected' ? 'reject' : 'comment';

        // Build the resume payload
        const resumeData: PlanApprovalResponse = {
          action: apiAction,
          ...(feedback && { feedback }),
        };

        // Clear the interrupt before processing the stream
        // This allows the UI to show the streaming response
        clearActiveInterrupt();

        // Call the unified resume endpoint (same as useInterrupt)
        const response = await chatApi.resumeWorkflow(effectiveConversationId, resumeData);

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No reader available for resume stream');
        }

        // Process the SSE stream using same pattern as useInterrupt
        await processResumeStream(
          reader,
          effectiveConversationId,
          abortControllerRef.current.signal,
          {
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
            clearActivePlan,
          }
        );
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Stream was intentionally aborted
          return;
        }
        console.error('Error responding to plan:', error);
        updateActivePlanStatus('error', String(error));
      } finally {
        setPlanApprovalInProgress(false);
      }
    },
    [conversationId, sendMessage]
  );

  return {
    plans,
    activePlan,
    isPlanApprovalInProgress,
    handleToolResult,
    submitPlanAction,
  };
}

/**
 * Process SSE stream from resume endpoint
 * Uses same pattern as useInterrupt.processResumeStream
 */
async function processResumeStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  conversationId: string,
  abortSignal: AbortSignal,
  callbacks: {
    addMessage: (conversationId: string, message: Message) => void;
    updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
    setStreamingMessageId: (messageId: string | null) => void;
    setIsSending: (isSending: boolean) => void;
    addToolCallToMessage: (conversationId: string, messageId: string, toolCallId: string, toolName: string, args: Record<string, unknown>) => void;
    updateToolCall: (conversationId: string, messageId: string, toolCallId: string, status: 'running') => void;
    updateToolCallStreamingContent: (conversationId: string, messageId: string, toolCallId: string, content: string) => void;
    completeToolCall: (conversationId: string, messageId: string, toolCallId: string, result: string, success: boolean, executionTime: number | null, error: string | null) => void;
    setActivePlan: (plan: ActivePlanState | null) => void;
    setActiveInterrupt: (type: InterruptType, data: InterruptData, conversationId: string) => void;
    updateActivePlanStatus: (status: ActivePlanState['status'], message?: string) => void;
    updateActivePlanPresentation: (files: ActivePlanState['presentationFiles'], presentationUrl?: string | null) => void;
    clearActivePlan: () => void;
  }
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
    clearActivePlan,
  } = callbacks;

  // Helper to get current messages
  const getMessages = (convId: string) => {
    const state = useChatStore.getState();
    return state.messages[convId] || [];
  };

  let accumulatedContent = '';
  let buffer = '';
  let assistantMessageId = `assistant-resume-${Date.now()}`;
  let assistantMessageCreated = false;
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

          // Handle workflow_resumed event
          if (eventType === 'workflow_resumed') {
            if (parsed.message_id) {
              assistantMessageId = parsed.message_id;
            }
            if (assistantMessageCreated) {
              setStreamingMessageId(assistantMessageId);
              updateMessage(conversationId, assistantMessageId, {
                isStreaming: true,
              });
            }
            setIsSending(false);
            continue;
          }

          // Handle assistant_message_start
          if (eventType === 'assistant_message_start' && parsed.message_id) {
            const existingMessages = getMessages(conversationId);
            const existingMessage = existingMessages.find(
              (m) => m.id === assistantMessageId || m.id === parsed.message_id
            );

            if (existingMessage) {
              assistantMessageId = existingMessage.id;
              assistantMessageCreated = true;
              accumulatedContent = existingMessage.content || '';
              setStreamingMessageId(assistantMessageId);
              updateMessage(conversationId, assistantMessageId, {
                isStreaming: true,
              });
            } else if (!assistantMessageCreated) {
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
            setIsSending(false);
            continue;
          }

          // Handle assistant_message_chunk
          if (eventType === 'assistant_message_chunk' && parsed.content !== undefined) {
            if (!assistantMessageCreated) {
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
            streamingComplete = true;

            const completeText = extractTextContent(parsed.full_content ?? parsed.content ?? '');

            if (parsed.message_id && parsed.message_id !== assistantMessageId) {
              updateMessage(conversationId, assistantMessageId, {
                id: parsed.message_id,
                content: completeText,
                isStreaming: false,
              });
              assistantMessageId = parsed.message_id;
            } else {
              updateMessage(conversationId, assistantMessageId, {
                content: completeText,
                isStreaming: false,
              });
            }
            setStreamingMessageId(null);
            continue;
          }

          // Handle tool_call_start
          // Note: Duplicate protection is handled by addToolCallToMessage (checks by toolCallId)
          if (eventType === 'tool_call_start' && parsed.tool_name) {
            if (!assistantMessageCreated) {
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
          if (eventType === 'tool_call_complete' && parsed.tool_name) {
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

            // Handle presentation generation tools
            if (isPresentationGenerationTool(parsed.tool_name) && parsed.result) {
              const toolResult = parsePlanningToolResult(parsed.result);
              if (toolResult.success && toolResult.gamma_result) {
                updateActivePlanStatus('executed', toolResult.message || 'Apresentação gerada com sucesso!');

                const gammaResult = toolResult.gamma_result;
                const presentationUrl = gammaResult.presentation_url || null;

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
          // PLAN-SPECIFIC EVENTS
          // ================================================================

          if (eventType === 'plan_processing') {
            updateActivePlanStatus('processing', parsed.message || 'Processando plano...');
            continue;
          }

          if (eventType === 'plan_generating') {
            const version = parsed.version || 'nova';
            updateActivePlanStatus('generating', `Gerando plano v${version}...`);
            continue;
          }

          if (eventType === 'presentation_generating') {
            updateActivePlanStatus('executing', parsed.message || 'Gerando apresentação...');
            continue;
          }

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
          // INTERRUPT EVENTS
          // ================================================================

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
            setupPlanApprovalInterrupt(
              parsed,
              conversationId,
              setActivePlan as Parameters<typeof setupPlanApprovalInterrupt>[2],
              setActiveInterrupt as Parameters<typeof setupPlanApprovalInterrupt>[3]
            );
            continue;
          }

          // Handle done
          if (eventType === 'done') {
            if (parsed.status === 'rejected') {
              clearActivePlan();
            }
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
