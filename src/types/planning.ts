/**
 * Types for Planning Tools integration
 * Based on the Planning Tools API specification
 */

/**
 * Status of a presentation plan
 */
export type PlanStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'revised'
  | 'executed';

/**
 * Workflow status for active plan processing (LangGraph interrupt pattern)
 */
export type PlanWorkflowStatus =
  | 'idle'
  | 'generating'
  | 'pending_approval'
  | 'processing'
  | 'executing'
  | 'executed'
  | 'error';

/**
 * Active plan state for tracking the current plan approval workflow
 */
export interface ActivePlanState {
  planId: string;
  status: PlanWorkflowStatus;
  markdown?: string;
  version?: number;
  message?: string;
  /** Presentation files (available after execution) */
  presentationFiles?: PresentationFiles;
  /** Gamma hosted presentation URL (fallback) */
  presentationUrl?: string | null;
}

/**
 * Action taken during plan review
 */
export type ApprovalAction = 'approved' | 'rejected' | 'commented';

/**
 * Names of planning tools
 *
 * - create_plan: Creates plan v1 (NO interrupt - LLM calls request_plan_approval next)
 * - request_plan_approval: Requests user approval (DOES interrupt like ask_clarifying_questions)
 * - edit_plan: Edits existing plan with user feedback (NO interrupt)
 * - generate_presentation: Generates presentation via Gamma API
 * - approve_plan: Alternative to generate_presentation
 * - reject_plan: Rejects a pending plan
 * - get_active_plan: Checks if there's a pending plan
 */
export type PlanningToolName =
  | 'create_plan'
  | 'request_plan_approval'
  | 'edit_plan'
  | 'generate_presentation'
  | 'approve_plan'
  | 'reject_plan'
  | 'get_active_plan';

/**
 * Base interface for planning tool results
 */
export interface PlanningToolResult {
  success: boolean;
  plan_id?: string;
  markdown?: string; // Complete plan content in markdown format
  status?: PlanStatus;
  version?: number;
  message: string;
  error?: string;
  revision_id?: string;
  user_feedback?: string;
  approval_action?: ApprovalAction | null;
  parent_plan_id?: string | null;
  related_tool_name?: string;
  created_at?: string;
  updated_at?: string;
  approved_at?: string | null;
  executed_at?: string | null;
  revisions_count?: number;
  // Gamma presentation result (when plan is executed)
  gamma_result?: GammaResult;
  title?: string;
  description?: string;
}

// ============================================
// Presentation File Types
// ============================================

/**
 * Represents a presentation file stored in Supabase Storage
 */
export interface PresentationFile {
  storage_path: string;
  signed_url: string;
  size_bytes: number;
}

/**
 * Collection of presentation files (PDF and PPTX exports)
 */
export interface PresentationFiles {
  pdf?: PresentationFile;
  pptx?: PresentationFile;
}

/**
 * File information from generate_presentation result
 */
export interface GammaFileInfo {
  url: string;
  filename: string;
  size: number;
  expires_at: string;
}

/**
 * Result from Gamma API presentation generation
 */
export interface GammaResult {
  presentation_url?: string;
  presentation_id?: string;
  credits_used?: number;
  files?: {
    pptx?: GammaFileInfo;
    pdf?: GammaFileInfo;
  } | PresentationFiles;
  status?: 'success' | 'skipped' | 'error';
  generation_id?: string;
  credits_deducted?: number;
  credits_remaining?: number;
  message?: string;
  error?: string;
}

/**
 * SSE event data when presentation generation completes
 */
export interface PresentationCompleteEvent {
  status: 'executed';
  gamma_result: GammaResult;
}

/**
 * Response from the presentation files refresh endpoint
 */
export interface PresentationFilesResponse {
  plan_id: string;
  presentation_url: string | null;
  files: PresentationFiles;
}
