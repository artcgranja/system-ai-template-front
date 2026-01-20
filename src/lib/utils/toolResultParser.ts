/**
 * Utility functions for parsing and analyzing tool call results
 */

import { hasSpecificParser } from './toolSpecificParsers';

export type ParsedToolResult =
  | { type: 'array'; data: unknown[] }
  | { type: 'object'; data: Record<string, unknown> }
  | { type: 'primitive'; data: unknown }
  | { type: 'invalid'; raw: string };

/**
 * Extracts JSON from tool result string
 * Handles formats like: content='{...}' or direct JSON
 */
export function extractJsonFromResult(result: string): string | null {
  if (!result || typeof result !== 'string') {
    return null;
  }

  // Try to extract JSON from content='{...}' format (handles both single and double quotes)
  const contentStartSingle = result.indexOf("content='");
  const contentStartDouble = result.indexOf('content="');
  const contentStart = contentStartSingle !== -1 ? contentStartSingle : contentStartDouble;
  const quoteChar = contentStartSingle !== -1 ? "'" : '"';
  
  if (contentStart !== -1) {
    const contentValueStart = contentStart + 9; // length of "content='"
    let contentEnd = -1;
    let inEscape = false;
    
    // Find the matching quote, handling escaped quotes
    for (let i = contentValueStart; i < result.length; i++) {
      const char = result[i];
      if (inEscape) {
        inEscape = false;
        continue;
      }
      if (char === '\\') {
        inEscape = true;
        continue;
      }
      if (char === quoteChar) {
        contentEnd = i;
        break;
      }
    }
    
    if (contentEnd !== -1) {
      // Extract the content between quotes
      const extracted = result.substring(contentValueStart, contentEnd);
      
      // The extracted content has escape sequences from the outer string context (content='...')
      // We need to unescape them once to get valid JSON
      // Use a simple approach: replace double escapes with single escapes
      // Order matters: handle \\\\ first, then \\n, \\r, etc.
      const unescaped = extracted
        .replace(/\\\\/g, '\u0000') // Temporary placeholder for double backslash
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\u0000/g, '\\'); // Restore single backslash
      
      return unescaped;
    }
  }

  // Try to find JSON object/array directly in the result
  // Use a more robust approach: find the first { or [ and try to match balanced braces
  const startMatch = result.match(/(\{|\[)/);
  if (startMatch) {
    const startIndex = startMatch.index!;
    const startChar = startMatch[1];
    const endChar = startChar === '{' ? '}' : ']';
    
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = startIndex; i < result.length; i++) {
      const char = result[i];
      const prevChar = i > 0 ? result[i - 1] : '';
      
      // Handle string escaping
      if (prevChar !== '\\') {
        if (!inString && (char === '"' || char === "'")) {
          inString = true;
          stringChar = char;
        } else if (inString && char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }
      
      if (!inString) {
        if (char === startChar) depth++;
        if (char === endChar) {
          depth--;
          if (depth === 0) {
            const jsonCandidate = result.substring(startIndex, i + 1);
            return jsonCandidate;
          }
        }
      }
    }
  }

  // Return null if no JSON found
  return null;
}

/**
 * Parses and validates JSON from tool result
 */
export function parseToolResult(result: string): ParsedToolResult {
  if (!result || typeof result !== 'string') {
    return { type: 'invalid', raw: result || '' };
  }

  const jsonString = extractJsonFromResult(result);
  
  if (!jsonString) {
    return { type: 'invalid', raw: result };
  }

  try {
    const parsed = JSON.parse(jsonString);

    if (Array.isArray(parsed)) {
      return { type: 'array', data: parsed };
    }

    if (typeof parsed === 'object' && parsed !== null) {
      return { type: 'object', data: parsed as Record<string, unknown> };
    }

    return { type: 'primitive', data: parsed };
  } catch {
    // If parsing fails, return invalid
    return { type: 'invalid', raw: result };
  }
}

/**
 * Checks if an array contains objects (for table rendering)
 */
export function isArrayOfObjects(arr: unknown[]): arr is Record<string, unknown>[] {
  return arr.length > 0 && arr.every(item => typeof item === 'object' && item !== null && !Array.isArray(item));
}

/**
 * Checks if an array of objects has at least one numeric column
 */
function hasNumericColumns(data: Record<string, unknown>[]): boolean {
  if (data.length === 0) return false;

  const allKeys = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
  
  return allKeys.some(key => {
    const sampleValue = data.find(obj => obj[key] !== undefined)?.[key];
    // Exclude ID columns and check if it's a number
    if (key.toLowerCase().includes('id')) return false;
    return typeof sampleValue === 'number' && !isNaN(sampleValue);
  });
}

/**
 * Checks if parsed tool result can be displayed as a chart
 * @param parsed - The parsed tool result
 * @param toolName - Optional tool name to check for specific parsers
 * @returns true if the result can be displayed as a chart
 */
export function canDisplayAsChart(
  parsed: ParsedToolResult,
  toolName?: string
): boolean {
  // Check if it's invalid or primitive - can't display as chart
  if (parsed.type === 'invalid' || parsed.type === 'primitive') {
    return false;
  }

  // Check if tool has a specific parser that returns charts
  if (toolName && hasSpecificParser(toolName, parsed)) {
    return true;
  }

  // Check if it's an array of objects with numeric columns
  if (parsed.type === 'array' && isArrayOfObjects(parsed.data)) {
    return hasNumericColumns(parsed.data);
  }

  // Check if it's an object containing an array of objects with numeric columns
  if (parsed.type === 'object') {
    const obj = parsed.data;
    const keys = Object.keys(obj);
    
    // Find array fields
    for (const key of keys) {
      const value = obj[key];
      if (Array.isArray(value) && isArrayOfObjects(value)) {
        if (hasNumericColumns(value)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Formats a key name from snake_case to Title Case
 */
export function formatKeyName(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formats a date string to Brazilian format
 */
function formatDateString(value: string): string | null {
  const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (dateMatch) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR');
      }
    } catch {
      // Not a valid date
    }
  }
  return null;
}

/**
 * Formats a value for display
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }

  if (typeof value === 'number') {
    // Format large numbers with separators
    return value.toLocaleString('pt-BR');
  }

  if (typeof value === 'string') {
    // Check if it's a date string
    const formatted = formatDateString(value);
    if (formatted) {
      return formatted;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return `[${value.length} itens]`;
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    // Handle date range objects (periodo with inicio/fim)
    if (keys.includes('inicio') && keys.includes('fim')) {
      const inicio = obj['inicio'];
      const fim = obj['fim'];
      const inicioFormatted = typeof inicio === 'string' ? formatDateString(inicio) || inicio : String(inicio);
      const fimFormatted = typeof fim === 'string' ? formatDateString(fim) || fim : String(fim);
      return `${inicioFormatted} até ${fimFormatted}`;
    }

    // Handle small objects with simple values (max 4 keys)
    if (keys.length > 0 && keys.length <= 4) {
      const allSimple = keys.every(key => {
        const v = obj[key];
        return v === null ||
               typeof v === 'string' ||
               typeof v === 'number' ||
               typeof v === 'boolean';
      });

      if (allSimple) {
        return keys.map(key => {
          const v = obj[key];
          let formattedVal: string;
          if (v === null || v === undefined) {
            formattedVal = '-';
          } else if (typeof v === 'number') {
            formattedVal = v.toLocaleString('pt-BR');
          } else if (typeof v === 'boolean') {
            formattedVal = v ? 'Sim' : 'Não';
          } else if (typeof v === 'string') {
            formattedVal = formatDateString(v) || v;
          } else {
            formattedVal = String(v);
          }
          return `${formatKeyName(key)}: ${formattedVal}`;
        }).join(' | ');
      }
    }

    return `[${keys.length} campos]`;
  }

  return String(value);
}

