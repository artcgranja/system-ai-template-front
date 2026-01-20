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
}

/**
 * Parsed clarification event from SSE
 */
export interface ClarificationEvent {
  context: string;
  questions: ClarificationQuestion[];
}

/**
 * Completes the running tool call during an interrupt
 * This prevents tool calls from staying in "running" state forever
 *
 * @param conversationId - The conversation ID
 * @param assistantMessageId - The assistant message ID containing the tool call
 * @param interruptMessage - Message to show as the tool result (e.g., "Aguardando resposta do usuario...")
 * @param getMessages - Function to get messages for a conversation
 * @param completeToolCall - Function to complete a tool call
 */
export function completeRunningToolCallForInterrupt(
  conversationId: string,
  assistantMessageId: string,
  interruptMessage: string,
  getMessages: GetMessagesFn,
  completeToolCall: CompleteToolCallFn
): void {
  const messages = getMessages(conversationId);
  const message = messages.find((m) => m.id === assistantMessageId);
  const runningToolCall = message?.toolCalls?.find((tc) => tc.status === 'running');

  if (runningToolCall) {
    completeToolCall(
      conversationId,
      assistantMessageId,
      runningToolCall.id,
      interruptMessage,
      true, // Mark as success since interrupt is expected
      null,
      null
    );
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
