/**
 * Helper functions for handling LangGraph interrupts
 * These utilities reduce code duplication in useChat.ts and useInterrupt.ts
 */

import type { Message } from '@/types/chat';
import type {
  InterruptType,
  InterruptData,
  ClarificationQuestionsData,
  PlanApprovalInterruptData,
  ClarificationQuestion,
} from '@/types/interrupt';

/**
 * Function signature for completing a tool call
 */
type CompleteToolCallFn = (
  conversationId: string,
  messageId: string,
  toolCallId: string,
  result: string,
  success: boolean,
  executionTime: number | null,
  error: string | null
) => void;

/**
 * Function signature for getting messages
 */
type GetMessagesFn = (conversationId: string) => Message[];

/**
 * Function signature for setting active plan
 */
type SetActivePlanFn = (plan: {
  planId: string;
  threadId: string;
  status: 'pending_approval';
  markdown: string;
  version: number;
  message: string;
}) => void;

/**
 * Function signature for setting active interrupt
 */
type SetActiveInterruptFn = (
  type: InterruptType,
  data: InterruptData,
  conversationId: string
) => void;

/**
 * Parsed plan approval event from SSE
 *
 * New architecture (2026):
 * - Each edit_plan creates a NEW plan_id
 * - parent_plan_id tracks the previous version
 */
export interface PlanApprovalEvent {
  plan_id: string;
  thread_id: string;
  markdown: string;
  version: number;
  message: string;
  /** Parent plan ID (set when this is a revised version from edit_plan) */
  parent_plan_id?: string;
  /** Tool call ID that triggered this interrupt (for tracking multiple parallel interrupts) */
  call_id?: string;
}

/**
 * Parsed clarification event from SSE
 */
export interface ClarificationEvent {
  context: string;
  questions: ClarificationQuestion[];
  /** Tool call ID that triggered this interrupt (for tracking multiple parallel interrupts) */
  call_id?: string;
}

/**
 * Completes the running tool call during an interrupt
 * This prevents tool calls from staying in "running" state forever
 *
 * **CRITICAL FIX (2026)**: When multiple tool calls execute in parallel and trigger interrupts,
 * we must identify the SPECIFIC tool call that generated the interrupt, not just the first
 * one with status 'running'. This fixes the issue where only the first interrupt completes
 * correctly while subsequent ones continue processing.
 *
 * **Reference**: LangGraph v0.4+ supports multiple simultaneous interrupts. Each interrupt
 * event should include a `call_id` to map back to the specific tool call. See:
 * - https://github.com/langchain-ai/langgraph/issues/6626 (identical IDs bug)
 * - https://changelog.langchain.com/announcements/langgraph-v0-4-working-with-interrupts
 *
 * @param conversationId - The conversation ID
 * @param assistantMessageId - The assistant message ID containing the tool call
 * @param interruptMessage - Message to show as the tool result (e.g., "Aguardando resposta do usuario...")
 * @param getMessages - Function to get messages for a conversation
 * @param completeToolCall - Function to complete a tool call
 * @param callId - Optional tool call ID from the interrupt event (preferred method)
 * @param toolName - Optional tool name to help identify the correct tool call (fallback)
 */
export function completeRunningToolCallForInterrupt(
  conversationId: string,
  assistantMessageId: string,
  interruptMessage: string,
  getMessages: GetMessagesFn,
  completeToolCall: CompleteToolCallFn,
  callId?: string | null,
  toolName?: string
): void {
  const messages = getMessages(conversationId);
  
  // CRITICAL FIX: When processing interrupts in resume stream, the assistantMessageId
  // might be a new message (assistant-resume-...), but the tool call is in the ORIGINAL message.
  // We need to search ALL messages in the conversation to find the tool call.
  let message = messages.find((m) => m.id === assistantMessageId);
  
  // If message not found or has no tool calls, search all messages for the tool call
  // This handles the case where interrupt is processed in resume stream but tool call is in original message
  // NOTE: Accept both 'running' AND 'starting' status because interrupt may arrive before tool_call_execution
  if (!message?.toolCalls || message.toolCalls.length === 0) {
    // Search all messages for the tool call with matching call_id or tool_name
    if (callId) {
      for (const msg of messages) {
        const toolCall = msg.toolCalls?.find((tc) => tc.id === callId && (tc.status === 'running' || tc.status === 'starting'));
        if (toolCall) {
          message = msg;
          break;
        }
      }
    } else if (toolName) {
      // Find most recent message with running/starting tool call matching tool_name
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const toolCall = msg.toolCalls?.find((tc) => tc.tool_name === toolName && (tc.status === 'running' || tc.status === 'starting'));
        if (toolCall) {
          message = msg;
          break;
        }
      }
    }
  }
  
  if (!message?.toolCalls || message.toolCalls.length === 0) {
    // Log detailed error for debugging
    console.error(
      `[Interrupt] No message found with tool calls. ` +
      `Searched message ID: ${assistantMessageId}, ` +
      `call_id: ${callId || 'none'}, tool_name: ${toolName || 'none'}. ` +
      `Available messages: ${messages.map(m => `${m.id}(${m.toolCalls?.length || 0} tool calls)`).join(', ')}`
    );
    return;
  }

  let targetToolCall: (typeof message.toolCalls)[number] | null = null;
  let targetMessage = message;

  // Strategy 1: Use call_id (REQUIRED - backend always sends this)
  // This is the primary and most reliable method for parallel interrupts
  // Per LangGraph v0.4+ documentation and our backend contract
  // NOTE: Accept both 'running' AND 'starting' status because plan_awaiting_approval
  // may arrive before tool_call_execution (which changes status to 'running')
  if (callId) {
    // First try in the specified message
    const foundInMessage = message.toolCalls.find(
      (tc) => tc.id === callId && (tc.status === 'running' || tc.status === 'starting')
    );

    if (foundInMessage) {
      targetToolCall = foundInMessage;
    } else {
      // If not found, search ALL messages (handles resume stream case where tool call is in original message)
      for (const msg of messages) {
        const toolCall = msg.toolCalls?.find(
          (tc) => tc.id === callId && (tc.status === 'running' || tc.status === 'starting')
        );
        if (toolCall) {
          targetToolCall = toolCall;
          targetMessage = msg;
          break;
        }
      }
    }
    
    if (targetToolCall) {
      completeToolCall(
        conversationId,
        targetMessage.id, // Use the message that actually contains the tool call
        targetToolCall.id,
        interruptMessage,
        true, // Mark as success since interrupt is expected
        null,
        null
      );
      return;
    } else {
      // call_id provided but tool call not found - check if it was already completed
      const allToolCalls = messages.flatMap(m => m.toolCalls || []);
      const completedToolCall = allToolCalls.find(tc => tc.id === callId);
      
      if (completedToolCall) {
        // Tool call was already completed - this is OK, just log info
        console.info(
          `[Interrupt] call_id "${callId}" tool call already completed (status: ${completedToolCall.status}). ` +
          `This is normal if interrupt was processed after tool completion.`
        );
        return;
      } else {
        // Tool call not found at all - this is an error
        console.error(
          `[Interrupt] call_id "${callId}" provided but no matching tool call found in any message. ` +
          `Available tool calls: ${allToolCalls.map(tc => `${tc.tool_name}(${tc.id}, status: ${tc.status})`).join(', ')}`
        );
      }
    }
  } else {
    // call_id missing - backend should always send this
    console.warn(
      `[Interrupt] call_id missing in interrupt event. ` +
      `Backend should always include call_id. Falling back to tool_name matching.`
    );
  }

  // Strategy 2: Fallback to tool_name matching (only if call_id is missing)
  // This should rarely be needed since backend always sends call_id
  // Search ALL messages, not just the specified one (handles resume stream case)
  // NOTE: Accept both 'running' AND 'starting' status because interrupt may arrive before tool_call_execution
  if (toolName && !targetToolCall) {
    type ToolCallWithMessage = { toolCall: (typeof message.toolCalls)[number]; message: typeof message };
    const allMatchingToolCalls: ToolCallWithMessage[] = [];

    // Collect all matching tool calls from all messages
    for (const msg of messages) {
      const matching = msg.toolCalls?.filter(
        (tc) => tc.tool_name === toolName && (tc.status === 'running' || tc.status === 'starting')
      ) || [];
      matching.forEach(tc => allMatchingToolCalls.push({ toolCall: tc, message: msg }));
    }
    
    if (allMatchingToolCalls.length > 0) {
      // Use the most recent one (last in array)
      const mostRecent = allMatchingToolCalls[allMatchingToolCalls.length - 1];
      targetToolCall = mostRecent.toolCall;
      targetMessage = mostRecent.message;
      
      if (allMatchingToolCalls.length > 1 && targetToolCall) {
        console.warn(
          `[Interrupt] Fallback: Multiple running tool calls found for ${toolName} (${allMatchingToolCalls.length}). ` +
          `Using most recent: ${targetToolCall.id}. ` +
          `All call_ids: ${allMatchingToolCalls.map(t => t.toolCall.id).join(', ')}. ` +
          `Backend should send call_id to avoid ambiguity.`
        );
      }
      
      if (targetToolCall) {
        completeToolCall(
          conversationId,
          targetMessage.id, // Use the message that actually contains the tool call
          targetToolCall.id,
          interruptMessage,
          true,
          null,
          null
        );
        return;
      }
    }
  }

  // Strategy 3: Last resort fallback (should never happen if backend sends call_id correctly)
  // Search ALL messages for any running/starting tool call
  // NOTE: Accept both 'running' AND 'starting' status because interrupt may arrive before tool_call_execution
  type ToolCallWithMessage = { toolCall: (typeof message.toolCalls)[number]; message: typeof message };
  const allPendingToolCalls: ToolCallWithMessage[] = [];

  for (const msg of messages) {
    const pending = msg.toolCalls?.filter((tc) => tc.status === 'running' || tc.status === 'starting') || [];
    pending.forEach(tc => allPendingToolCalls.push({ toolCall: tc, message: msg }));
  }

  if (allPendingToolCalls.length > 0) {
    console.error(
      `[Interrupt] CRITICAL: No call_id provided and tool_name fallback failed. ` +
      `Completing most recent pending tool call (may be incorrect). ` +
      `Pending tool calls: ${allPendingToolCalls.map(t => `${t.toolCall.tool_name}(${t.toolCall.id})`).join(', ')}. ` +
      `Backend MUST send call_id in interrupt events.`
    );
    
    const mostRecent = allPendingToolCalls[allPendingToolCalls.length - 1];
    targetToolCall = mostRecent.toolCall;
    targetMessage = mostRecent.message;

    completeToolCall(
      conversationId,
      targetMessage.id, // Use the message that actually contains the tool call
      targetToolCall.id,
      interruptMessage,
      true,
      null,
      null
    );
  } else {
    // No running tool calls found - check if they were already completed
    const allToolCalls = messages.flatMap(m => m.toolCalls || []);
    const completedToolCalls = allToolCalls.filter(tc => tc.status === 'completed' || tc.status === 'error');
    
    if (completedToolCalls.length > 0) {
      console.info(
        `[Interrupt] No running tool calls found, but found ${completedToolCalls.length} completed tool calls. ` +
        `Interrupt may have been processed after tool completion. This is OK. ` +
        `Message ID searched: ${assistantMessageId}`
      );
    } else {
      console.error(
        `[Interrupt] CRITICAL: No tool calls found in any message. ` +
        `This should not happen. Message ID searched: ${assistantMessageId}, ` +
        `Available messages: ${messages.map(m => `${m.id}(${m.toolCalls?.length || 0} tool calls)`).join(', ')}`
      );
    }
  }
}

/**
 * Sets up the plan approval interrupt state
 * This handles both activePlan (for usePlanningTools workflow) and activeInterrupt (for UI)
 *
 * @param parsed - The parsed plan approval event data
 * @param conversationId - The conversation ID
 * @param setActivePlan - Function to set the active plan
 * @param setActiveInterrupt - Function to set the active interrupt
 */
export function setupPlanApprovalInterrupt(
  parsed: PlanApprovalEvent,
  conversationId: string,
  setActivePlan: SetActivePlanFn,
  setActiveInterrupt: SetActiveInterruptFn
): void {
  // Set activePlan for usePlanningTools workflow
  // Note: In new architecture, plan_id changes with each edit_plan
  setActivePlan({
    planId: parsed.plan_id,
    threadId: parsed.thread_id,
    status: 'pending_approval',
    markdown: parsed.markdown,
    version: parsed.version,
    message: parsed.message,
  });

  // Set activeInterrupt to show the InterruptCard with PlanApprovalCard
  // Include parent_plan_id for version tracking
  const interruptData: PlanApprovalInterruptData = {
    type: 'plan_approval',
    plan_id: parsed.plan_id,
    thread_id: parsed.thread_id,
    markdown: parsed.markdown,
    version: parsed.version,
    message: parsed.message,
    parent_plan_id: parsed.parent_plan_id,
  };

  setActiveInterrupt('plan_approval', interruptData, conversationId);
}

/**
 * Sets up the clarification questions interrupt state
 *
 * @param parsed - The parsed clarification event data
 * @param conversationId - The conversation ID
 * @param setActiveInterrupt - Function to set the active interrupt
 */
export function setupClarificationInterrupt(
  parsed: ClarificationEvent,
  conversationId: string,
  setActiveInterrupt: SetActiveInterruptFn
): void {
  const interruptData: ClarificationQuestionsData = {
    type: 'clarification_questions',
    context: parsed.context,
    questions: parsed.questions,
  };

  setActiveInterrupt('clarification_questions', interruptData, conversationId);
}

/**
 * Interrupt message constants
 */
export const INTERRUPT_MESSAGES = {
  CLARIFICATION: 'Aguardando resposta do usuario...',
  PLAN_APPROVAL: 'Aguardando aprovacao do plano...',
} as const;
