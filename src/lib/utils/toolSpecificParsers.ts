/**
 * Specific parsers for known tools
 * Provides custom visualization logic for important tools
 */

import type { ParsedToolResult } from './toolResultParser';

export interface ToolSpecificConfig {
  toolName: string;
  hasSpecificParser: (data: ParsedToolResult) => boolean;
  getChartType: () => 'consumption-history' | 'generic';
}

export interface ConsumptionHistoryData {
  month: number;
  month_name: string;
  year: number;
  consumption_kwh: number;
  period_start?: string;
  period_end?: string;
}

/**
 * Checks if data matches the consumption history structure
 */
export function isConsumptionHistoryData(
  data: unknown[]
): data is ConsumptionHistoryData[] {
  if (data.length === 0) return false;

  const firstItem = data[0];
  if (!firstItem || typeof firstItem !== 'object' || Array.isArray(firstItem)) {
    return false;
  }

  const item = firstItem as Record<string, unknown>;
  return (
    typeof item.month === 'number' &&
    typeof item.month_name === 'string' &&
    typeof item.year === 'number' &&
    typeof item.consumption_kwh === 'number'
  );
}

/**
 * Checks if parsed result contains consumption history data
 */
export function hasConsumptionHistory(parsed: ParsedToolResult): boolean {
  if (parsed.type === 'array') {
    return isConsumptionHistoryData(parsed.data as Record<string, unknown>[]);
  }

  if (parsed.type === 'object') {
    const obj = parsed.data as Record<string, unknown>;
    // Check if it has a 'history' field with consumption data
    const history = obj.history;
    if (Array.isArray(history) && history.length > 0) {
      return isConsumptionHistoryData(history as Record<string, unknown>[]);
    }
  }

  return false;
}

/**
 * Checks if parsed result contains planning tool data
 */
export function hasPlanningToolResult(parsed: ParsedToolResult): boolean {
  if (parsed.type !== 'object') {
    return false;
  }

  const obj = parsed.data as Record<string, unknown>;
  
  // Check for required planning tool fields
  return (
    typeof obj.success === 'boolean' &&
    typeof obj.message === 'string' &&
    (obj.plan_id !== undefined || obj.status !== undefined)
  );
}

/**
 * Extracts consumption history data from parsed result
 */
export function extractConsumptionHistory(
  parsed: ParsedToolResult
): ConsumptionHistoryData[] | null {
  if (parsed.type === 'array' && isConsumptionHistoryData(parsed.data as Record<string, unknown>[])) {
    return parsed.data as ConsumptionHistoryData[];
  }

  if (parsed.type === 'object') {
    const obj = parsed.data as Record<string, unknown>;
    const history = obj.history;
    if (Array.isArray(history) && isConsumptionHistoryData(history as Record<string, unknown>[])) {
      return history as ConsumptionHistoryData[];
    }
  }

  return null;
}

/**
 * Gets metadata from consumption history result (like client_id, total_records)
 */
export function getConsumptionHistoryMetadata(
  parsed: ParsedToolResult
): Record<string, unknown> {
  if (parsed.type === 'object') {
    const obj = parsed.data as Record<string, unknown>;
    const metadata: Record<string, unknown> = {};
    
    Object.keys(obj).forEach(key => {
      if (key !== 'history') {
        metadata[key] = obj[key];
      }
    });
    
    return metadata;
  }

  return {};
}

/**
 * Registry of tool-specific parsers
 */
export const TOOL_SPECIFIC_PARSERS: Record<string, ToolSpecificConfig> = {
  get_client_history: {
    toolName: 'get_client_history',
    hasSpecificParser: (parsed: ParsedToolResult) => hasConsumptionHistory(parsed),
    getChartType: () => 'consumption-history',
  },
  // Planning tools
  create_plan: {
    toolName: 'create_plan',
    hasSpecificParser: (parsed: ParsedToolResult) => hasPlanningToolResult(parsed),
    getChartType: () => 'generic',
  },
  edit_plan: {
    toolName: 'edit_plan',
    hasSpecificParser: (parsed: ParsedToolResult) => hasPlanningToolResult(parsed),
    getChartType: () => 'generic',
  },
  request_plan_approval: {
    toolName: 'request_plan_approval',
    hasSpecificParser: (parsed: ParsedToolResult) => hasPlanningToolResult(parsed),
    getChartType: () => 'generic',
  },
  get_active_plan: {
    toolName: 'get_active_plan',
    hasSpecificParser: (parsed: ParsedToolResult) => hasPlanningToolResult(parsed),
    getChartType: () => 'generic',
  },
};

/**
 * Checks if a tool has a specific parser
 */
export function hasSpecificParser(
  toolName: string,
  parsed: ParsedToolResult
): boolean {
  const parser = TOOL_SPECIFIC_PARSERS[toolName];
  if (!parser) return false;
  
  return parser.hasSpecificParser(parsed);
}

/**
 * Gets the chart type for a specific tool
 */
export function getSpecificChartType(toolName: string): string | null {
  const parser = TOOL_SPECIFIC_PARSERS[toolName];
  if (!parser) return null;
  
  return parser.getChartType();
}

