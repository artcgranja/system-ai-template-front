/**
 * Types for LangGraph Interrupt System (Human-in-the-Loop)
 * Supports clarification questions and plan approval interrupts
 */

// ============================================
// Question Types for Clarification Questions
// ============================================

/**
 * Option for select-type questions
 */
export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

/**
 * Base question interface
 */
interface BaseQuestion {
  id: string;
  question: string;
  default_value?: string;
}

/**
 * Text input question
 */
export interface TextQuestion extends BaseQuestion {
  type: 'text';
  placeholder?: string;
}

/**
 * Single select question (radio buttons)
 */
export interface SingleSelectQuestion extends BaseQuestion {
  type: 'single_select';
  options: QuestionOption[];
}

/**
 * Multi select question (checkboxes)
 */
export interface MultiSelectQuestion extends BaseQuestion {
  type: 'multi_select';
  options: QuestionOption[];
}

/**
 * Slider question (numeric range)
 */
export interface SliderQuestion extends BaseQuestion {
  type: 'slider';
  min_value: number;
  max_value: number;
}

/**
 * Union type for all question types
 */
export type ClarificationQuestion =
  | TextQuestion
  | SingleSelectQuestion
  | MultiSelectQuestion
  | SliderQuestion;

// ============================================
// Interrupt Data Types
// ============================================

/**
 * Data for clarification_questions interrupt
 */
export interface ClarificationQuestionsData {
  type: 'clarification_questions';
  context: string;
  questions: ClarificationQuestion[];
}

/**
 * Data for plan_approval interrupt (mirrors plan_awaiting_approval)
 * Note: This is separate from PlanningToolResult which has more fields
 *
 * New architecture (2026):
 * - Each edit_plan creates a NEW plan_id
 * - parent_plan_id tracks the previous version
 */
export interface PlanApprovalInterruptData {
  type: 'plan_approval';
  plan_id: string;
  thread_id: string;
  markdown: string;
  version: number;
  message: string;
  /** Parent plan ID (set when this is a revised version from edit_plan) */
  parent_plan_id?: string;
}

/**
 * Union type for all interrupt data types
 */
export type InterruptData = ClarificationQuestionsData | PlanApprovalInterruptData;

/**
 * Type for interrupt types
 */
export type InterruptType = 'clarification_questions' | 'plan_approval';

// ============================================
// Interrupt State
// ============================================

/**
 * State for managing active interrupt
 */
export interface InterruptState {
  active: boolean;
  type: InterruptType | null;
  data: InterruptData | null;
  conversationId: string | null;
}

/**
 * Initial/empty interrupt state
 */
export const initialInterruptState: InterruptState = {
  active: false,
  type: null,
  data: null,
  conversationId: null,
};

// ============================================
// Response Types
// ============================================

/**
 * Response to clarification questions
 * Keys are question IDs, values are user responses
 */
export type ClarificationQuestionsResponse = Record<string, string | number | string[]>;

/**
 * Response to plan approval
 * - approve: Approves the plan and generates the presentation (feedback optional)
 * - reject: Cancels the plan and ends the flow (feedback optional)
 * - comment: Requests revision with changes (feedback REQUIRED)
 */
export interface PlanApprovalResponse {
  action: 'approve' | 'reject' | 'comment';
  feedback?: string;
}

/**
 * Union type for all interrupt responses
 */
export type InterruptResponse = ClarificationQuestionsResponse | PlanApprovalResponse;

// ============================================
// Resume Payload
// ============================================

/**
 * Payload for resuming a workflow after interrupt
 * Sent to POST /api/chat/stream with resume field
 */
export interface ResumePayload {
  conversation_id: string;
  resume: InterruptResponse;
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if interrupt data is clarification questions
 */
export function isClarificationQuestions(
  data: InterruptData | null
): data is ClarificationQuestionsData {
  return data?.type === 'clarification_questions';
}

/**
 * Check if interrupt data is plan approval
 */
export function isPlanApprovalInterrupt(
  data: InterruptData | null
): data is PlanApprovalInterruptData {
  return data?.type === 'plan_approval';
}

/**
 * Check if question is text type
 */
export function isTextQuestion(question: ClarificationQuestion): question is TextQuestion {
  return question.type === 'text';
}

/**
 * Check if question is single select type
 */
export function isSingleSelectQuestion(
  question: ClarificationQuestion
): question is SingleSelectQuestion {
  return question.type === 'single_select';
}

/**
 * Check if question is multi select type
 */
export function isMultiSelectQuestion(
  question: ClarificationQuestion
): question is MultiSelectQuestion {
  return question.type === 'multi_select';
}

/**
 * Check if question is slider type
 */
export function isSliderQuestion(question: ClarificationQuestion): question is SliderQuestion {
  return question.type === 'slider';
}
