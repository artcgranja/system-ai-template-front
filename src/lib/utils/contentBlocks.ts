/**
 * Utilities for deriving content blocks from message data
 *
 * This implements the "derived state" pattern where:
 * - toolCalls[] is the single source of truth for tool call data
 * - contentBlockRefs[] stores only the ORDER of blocks (with IDs for tool calls)
 * - deriveContentBlocks() combines them to produce the full ContentBlock[]
 *
 * This prevents data duplication and ensures consistency.
 */

import type { Message, ContentBlock, ContentBlockRef, ToolCall } from '@/types/chat';

/**
 * Derives the full ContentBlock[] from a message's contentBlockRefs and toolCalls
 *
 * This is the main function to use when you need to display content blocks.
 * It combines the order information from contentBlockRefs with the current
 * tool call data from toolCalls[].
 *
 * @param message The message to derive content blocks from
 * @returns Array of ContentBlock with full tool call data, or empty array if no refs
 *
 * @example
 * const blocks = deriveContentBlocks(message);
 * blocks.forEach(block => {
 *   if (block.type === 'text') console.log(block.content);
 *   if (block.type === 'tool_call') console.log(block.toolCall.status);
 * });
 */
export function deriveContentBlocks(message: Message): ContentBlock[] {
  const refs = message.contentBlockRefs;

  if (!refs || refs.length === 0) {
    return [];
  }

  const toolCallsMap = new Map<string, ToolCall>();
  if (message.toolCalls) {
    for (const tc of message.toolCalls) {
      toolCallsMap.set(tc.id, tc);
    }
  }

  const result: ContentBlock[] = [];

  for (const ref of refs) {
    if (ref.type === 'text') {
      // Text blocks are stored directly in refs
      result.push({ type: 'text', content: ref.content });
    } else if (ref.type === 'tool_call') {
      // Tool call blocks need to look up the current tool call data
      const toolCall = toolCallsMap.get(ref.toolCallId);
      if (toolCall) {
        result.push({ type: 'tool_call', toolCall });
      }
      // If tool call not found, skip it (shouldn't happen in normal flow)
    }
  }

  return result;
}

/**
 * Checks if a message has any content blocks (derived)
 *
 * @param message The message to check
 * @returns True if the message has content block refs
 */
export function hasContentBlocks(message: Message): boolean {
  return !!(message.contentBlockRefs && message.contentBlockRefs.length > 0);
}

/**
 * Creates a text block reference
 *
 * @param content The text content
 * @returns A text ContentBlockRef
 */
export function createTextBlockRef(content: string): ContentBlockRef {
  return { type: 'text', content };
}

/**
 * Creates a tool call block reference
 *
 * @param toolCallId The ID of the tool call to reference
 * @returns A tool_call ContentBlockRef
 */
export function createToolCallBlockRef(toolCallId: string): ContentBlockRef {
  return { type: 'tool_call', toolCallId };
}

/**
 * Adds a text block reference to the end of the refs array
 * Returns a new array (immutable)
 *
 * @param refs Current content block refs (or undefined)
 * @param content The text content to add
 * @returns New array with the text block added
 */
export function appendTextBlockRef(
  refs: ContentBlockRef[] | undefined,
  content: string
): ContentBlockRef[] {
  return [...(refs || []), createTextBlockRef(content)];
}

/**
 * Adds a tool call block reference to the end of the refs array
 * Returns a new array (immutable)
 *
 * @param refs Current content block refs (or undefined)
 * @param toolCallId The ID of the tool call to reference
 * @returns New array with the tool call ref added
 */
export function appendToolCallBlockRef(
  refs: ContentBlockRef[] | undefined,
  toolCallId: string
): ContentBlockRef[] {
  return [...(refs || []), createToolCallBlockRef(toolCallId)];
}
