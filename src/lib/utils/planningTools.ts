/**
 * Utility functions for Planning Tools
 * Handles detection, parsing, and message building for planning tools
 */

import type {
  PlanningToolResult,
  PlanningToolName,
  ApprovalAction,
} from '@/types/planning';
import { extractJsonFromResult } from './toolResultParser';

/**
 * All planning tool names
 */
export const PLANNING_TOOLS: PlanningToolName[] = [
  'create_plan',
  'request_plan_approval',
  'edit_plan',
  'generate_presentation',
  'approve_plan',
  'reject_plan',
  'get_active_plan',
];

/**
 * Tools that create or edit plans (NO interrupt - LLM calls request_plan_approval next)
 */
export const PLAN_CREATION_TOOLS: PlanningToolName[] = [
  'create_plan',
  'edit_plan',
];

/**
 * Tools that request plan approval from user (trigger plan_awaiting_approval interrupt)
 * Only request_plan_approval triggers interrupt - works like ask_clarifying_questions
 */
export const PLAN_APPROVAL_REQUEST_TOOLS: PlanningToolName[] = [
  'request_plan_approval',
];

/**
 * Tools that generate the final presentation (return gamma_result)
 */
export const PRESENTATION_GENERATION_TOOLS: PlanningToolName[] = [
  'generate_presentation',
  'approve_plan',
];

/**
 * Checks if a tool name is a planning tool
 */
export function isPlanningTool(toolName: string): toolName is PlanningToolName {
  return PLANNING_TOOLS.includes(toolName as PlanningToolName);
}

/**
 * Checks if a tool creates or edits plans (NO interrupt in new architecture)
 */
export function isPlanCreationTool(toolName: string): boolean {
  return PLAN_CREATION_TOOLS.includes(toolName as PlanningToolName);
}

/**
 * Checks if a tool requests plan approval from user (triggers plan_awaiting_approval interrupt)
 * Only request_plan_approval triggers interrupt - works like ask_clarifying_questions
 */
export function isApprovalRequestTool(toolName: string): boolean {
  return PLAN_APPROVAL_REQUEST_TOOLS.includes(toolName as PlanningToolName);
}

/**
 * Checks if a tool generates the final presentation (returns gamma_result)
 */
export function isPresentationGenerationTool(toolName: string): boolean {
  return PRESENTATION_GENERATION_TOOLS.includes(toolName as PlanningToolName);
}

/**
 * Unescapes common escape sequences in a string
 * Converts \\n to \n, \\t to \t, etc.
 */
function unescapeString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

/**
 * Parses a planning tool result from a JSON string
 * Handles the result field from SSE tool_call_complete events
 */
export function parsePlanningToolResult(result: string): PlanningToolResult {
  if (!result || typeof result !== 'string') {
    return {
      success: false,
      message: 'Erro ao processar resposta da ferramenta',
      error: 'Resultado inválido ou vazio',
    };
  }

  try {
    // Extract JSON from result string (handles content='{...}' format)
    // extractJsonFromResult already handles unescaping the outer string context
    const jsonString = extractJsonFromResult(result);
    
    if (!jsonString) {
      console.warn('Planning tool: Could not extract JSON from result:', result.substring(0, 200));
      return {
        success: false,
        message: 'Erro ao processar resposta da ferramenta',
        error: 'Não foi possível extrair JSON do resultado',
      };
    }

    // Parse the JSON directly - extractJsonFromResult already handled unescaping
    let parsed: PlanningToolResult;
    try {
      parsed = JSON.parse(jsonString) as PlanningToolResult;
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      console.error('Planning tool: JSON parse error:', errorMessage);
      console.error('Planning tool: JSON string (first 500 chars):', jsonString.substring(0, 500));
      return {
        success: false,
        message: 'Erro ao processar resposta da ferramenta',
        error: `Erro ao fazer parse do JSON: ${errorMessage}`,
      };
    }
    
    // Unescape markdown field if it exists (handles double-escaped sequences)
    if (parsed.markdown && typeof parsed.markdown === 'string') {
      parsed.markdown = unescapeString(parsed.markdown);
    }
    
    // Debug log
    if (process.env.NODE_ENV === 'development') {
      console.log('Planning tool parsed result:', parsed);
    }

    // Validate required fields
    if (typeof parsed.success !== 'boolean') {
      return {
        success: false,
        message: parsed.message || 'Erro ao processar resposta da ferramenta',
        error: 'Campo success ausente ou inválido',
      };
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse planning tool result:', error);
    return {
      success: false,
      message: 'Erro ao processar resposta da ferramenta',
      error: String(error),
    };
  }
}

/**
 * Builds a review message to send to the agent
 */
export function buildReviewMessage(
  action: ApprovalAction,
  planId: string,
  feedback?: string,
  updatedMarkdown?: string
): string {
  if (action === 'approved') {
    return `Aprovar o plano ${planId}${feedback ? `. Feedback: ${feedback}` : ''}`;
  } else if (action === 'rejected') {
    return `Rejeitar o plano ${planId}${feedback ? `. Motivo: ${feedback}` : ''}`;
  } else {
    // commented action
    if (updatedMarkdown) {
      return `Comentar sobre o plano ${planId}. Comentário: ${feedback || 'Solicito as seguintes alterações'}. Aqui está o markdown atualizado:\n\n\`\`\`markdown\n${updatedMarkdown}\n\`\`\``;
    } else {
      return `Comentar sobre o plano ${planId}. Comentário: ${feedback || 'Sem comentários'}`;
    }
  }
}

/**
 * Normalizes presentation files from different formats
 * Converts { url, filename, size } to { storage_path, signed_url, size_bytes }
 */
export function normalizePresentationFiles(
  files: {
    pptx?: { url?: string; filename?: string; size?: number; expires_at?: string; storage_path?: string; signed_url?: string; size_bytes?: number };
    pdf?: { url?: string; filename?: string; size?: number; expires_at?: string; storage_path?: string; signed_url?: string; size_bytes?: number };
  } | undefined
): { pptx?: { storage_path: string; signed_url: string; size_bytes: number }; pdf?: { storage_path: string; signed_url: string; size_bytes: number } } | undefined {
  if (!files) return undefined;

  const normalized: { pptx?: { storage_path: string; signed_url: string; size_bytes: number }; pdf?: { storage_path: string; signed_url: string; size_bytes: number } } = {};

  if (files.pptx) {
    if (files.pptx.signed_url) {
      normalized.pptx = {
        storage_path: files.pptx.storage_path || '',
        signed_url: files.pptx.signed_url,
        size_bytes: files.pptx.size_bytes || 0,
      };
    } else if (files.pptx.url) {
      normalized.pptx = {
        storage_path: files.pptx.filename || '',
        signed_url: files.pptx.url,
        size_bytes: files.pptx.size || 0,
      };
    }
  }

  if (files.pdf) {
    if (files.pdf.signed_url) {
      normalized.pdf = {
        storage_path: files.pdf.storage_path || '',
        signed_url: files.pdf.signed_url,
        size_bytes: files.pdf.size_bytes || 0,
      };
    } else if (files.pdf.url) {
      normalized.pdf = {
        storage_path: files.pdf.filename || '',
        signed_url: files.pdf.url,
        size_bytes: files.pdf.size || 0,
      };
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}
