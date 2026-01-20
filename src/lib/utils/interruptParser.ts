/**
 * Utility for parsing LangGraph Interrupt from tool_call_complete error field
 *
 * @deprecated This module is deprecated as of 2026-01.
 * Interrupts now come as direct SSE events instead of embedded in tool_call_complete errors:
 * - `clarification_needed` event for clarification questions
 * - `plan_awaiting_approval` event for plan approval
 * - `interrupt` event as a generic fallback
 *
 * These utilities are kept for backward compatibility with older backend versions
 * that still send interrupts via the error field.
 *
 * The interrupt comes as a Python repr string in the format:
 * (Interrupt(value={'type': 'clarification_questions', ...}, id='...'),)
 *
 * @see https://github.com/your-org/your-repo/docs/interrupt-events.md
 */

import type { ClarificationQuestionsData, PlanApprovalInterruptData, InterruptData } from '@/types/interrupt';

/**
 * Result of parsing an interrupt from an error string
 */
export interface ParsedInterrupt {
  type: 'clarification_questions' | 'plan_approval';
  data: InterruptData;
  interruptId: string;
}

/**
 * Check if an error string contains a LangGraph Interrupt
 * @deprecated Use direct SSE events (clarification_needed, plan_awaiting_approval) instead
 */
export function isInterruptError(error: string | null | undefined): boolean {
  if (!error) return false;
  return error.includes('Interrupt(value=');
}

/**
 * Parse a LangGraph Interrupt from an error string
 *
 * @deprecated Use direct SSE events (clarification_needed, plan_awaiting_approval) instead.
 * The backend no longer sends interrupts via tool_call_complete error field.
 *
 * The error string format is:
 * (Interrupt(value={'type': 'clarification_questions', 'context': '...', 'questions': [...]}, id='abc123'),)
 *
 * @param error The error string from tool_call_complete
 * @returns Parsed interrupt data or null if parsing fails
 */
export function parseInterruptFromError(error: string): ParsedInterrupt | null {
  try {
    // Extract the value dict from Interrupt(value={...}, id='...')
    // Pattern: Interrupt(value= followed by { and then content until }, id='
    const valueMatch = error.match(/Interrupt\(value=(\{[\s\S]*?\}),\s*id='([^']+)'\)/);

    if (!valueMatch) {
      console.warn('Could not extract Interrupt value from error:', error.substring(0, 200));
      return null;
    }

    const [, pythonDictStr, interruptId] = valueMatch;

    // Convert Python dict syntax to JSON
    const jsonStr = pythonDictToJson(pythonDictStr);

    // Parse the JSON
    const data = JSON.parse(jsonStr) as { type: string; [key: string]: unknown };

    // Validate the type
    if (data.type !== 'clarification_questions' && data.type !== 'plan_approval') {
      console.warn('Unknown interrupt type:', data.type);
      return null;
    }

    return {
      type: data.type as 'clarification_questions' | 'plan_approval',
      data: data as unknown as InterruptData,
      interruptId,
    };
  } catch (e) {
    console.error('Failed to parse interrupt from error:', e, error.substring(0, 500));
    return null;
  }
}

/**
 * Convert Python dict string to JSON string
 * Handles:
 * - None -> null
 * - True -> true
 * - False -> false
 * - Single quotes -> double quotes (for keys and string values)
 */
function pythonDictToJson(pythonStr: string): string {
  let result = pythonStr;

  // Replace None with null (but not inside strings)
  // We do a simple replacement since None shouldn't appear in string values in our context
  result = result.replace(/\bNone\b/g, 'null');

  // Replace True/False with true/false
  result = result.replace(/\bTrue\b/g, 'true');
  result = result.replace(/\bFalse\b/g, 'false');

  // Convert single quotes to double quotes
  // This is tricky because we need to handle escaped quotes and nested quotes
  result = convertQuotes(result);

  return result;
}

/**
 * Convert Python single-quoted strings to JSON double-quoted strings
 * This handles the common cases for our interrupt data
 */
function convertQuotes(pythonStr: string): string {
  const result: string[] = [];
  let i = 0;
  let inString = false;
  let stringChar: "'" | '"' | null = null;

  while (i < pythonStr.length) {
    const char = pythonStr[i];
    const prevChar = i > 0 ? pythonStr[i - 1] : '';

    if (!inString) {
      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
        result.push('"'); // Always use double quotes in JSON
        i++;
        continue;
      }
    } else {
      // We're inside a string
      if (char === stringChar && prevChar !== '\\') {
        // End of string
        inString = false;
        stringChar = null;
        result.push('"');
        i++;
        continue;
      }

      // Handle escaped single quotes inside strings
      if (char === '\\' && i + 1 < pythonStr.length && pythonStr[i + 1] === "'") {
        result.push("'"); // Just the quote, no escape needed for single quote in JSON
        i += 2;
        continue;
      }

      // Handle double quotes inside single-quoted strings (need to escape them in JSON)
      if (char === '"' && stringChar === "'") {
        result.push('\\"');
        i++;
        continue;
      }
    }

    result.push(char);
    i++;
  }

  return result.join('');
}

/**
 * Raw question format from backend (all fields present, potentially null)
 */
interface RawQuestion {
  id: string;
  question: string;
  type: 'text' | 'single_select' | 'multi_select' | 'slider';
  placeholder?: string | null;
  options?: Array<{ value: string; label: string; description?: string | null }> | null;
  min_value?: number | null;
  max_value?: number | null;
  default_value?: string | null;
}

/**
 * Raw clarification questions data from backend
 */
interface RawClarificationQuestionsData {
  type: 'clarification_questions';
  context: string;
  questions: RawQuestion[];
}

/**
 * Extract clarification questions data from parsed interrupt
 * @deprecated Use direct SSE events - data comes pre-structured in clarification_needed event
 */
export function extractClarificationQuestions(
  parsed: ParsedInterrupt
): ClarificationQuestionsData | null {
  if (parsed.type !== 'clarification_questions') {
    return null;
  }

  const rawData = parsed.data as unknown as RawClarificationQuestionsData;

  // Normalize the questions - convert to proper typed structure
  const normalizedQuestions = rawData.questions.map((q) => {
    // Base fields
    const base = {
      id: q.id,
      question: q.question,
      default_value: q.default_value ?? undefined,
    };

    // Return appropriate structure based on type
    switch (q.type) {
      case 'text':
        return {
          ...base,
          type: 'text' as const,
          placeholder: q.placeholder ?? undefined,
        };
      case 'single_select':
        return {
          ...base,
          type: 'single_select' as const,
          options: (q.options ?? []).map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description ?? undefined,
          })),
        };
      case 'multi_select':
        return {
          ...base,
          type: 'multi_select' as const,
          options: (q.options ?? []).map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description ?? undefined,
          })),
        };
      case 'slider':
        return {
          ...base,
          type: 'slider' as const,
          min_value: q.min_value ?? 0,
          max_value: q.max_value ?? 100,
        };
      default:
        // Fallback to text type
        return {
          ...base,
          type: 'text' as const,
          placeholder: q.placeholder ?? undefined,
        };
    }
  });

  return {
    type: 'clarification_questions',
    context: rawData.context,
    questions: normalizedQuestions,
  };
}

/**
 * Raw plan approval data from backend
 */
interface RawPlanApprovalData {
  type: 'plan_approval';
  plan_id: string;
  thread_id: string;
  markdown: string;
  version: number;
  message: string;
}

/**
 * Extract plan approval data from parsed interrupt
 * @deprecated Use direct SSE events - data comes pre-structured in plan_awaiting_approval event
 */
export function extractPlanApproval(
  parsed: ParsedInterrupt
): PlanApprovalInterruptData | null {
  if (parsed.type !== 'plan_approval') {
    return null;
  }

  const rawData = parsed.data as unknown as RawPlanApprovalData;

  return {
    type: 'plan_approval',
    plan_id: rawData.plan_id,
    thread_id: rawData.thread_id,
    markdown: rawData.markdown,
    version: rawData.version,
    message: rawData.message,
  };
}
