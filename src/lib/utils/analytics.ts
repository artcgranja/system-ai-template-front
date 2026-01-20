/**
 * Analytics Utilities
 * Utility functions for analytics data processing
 */

import { startOfWeek, startOfMonth, parseISO, format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimeSeriesDataPoint, AnalyticsGroupBy } from '@/types/analytics';

/**
 * Safely parse an ISO date string
 * @param dateString - ISO date string to parse
 * @returns Parsed Date object or null if invalid
 */
function safeParseDateISO(dateString: string): Date | null {
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Regroups time series data points by the specified grouping period
 * @param dataPoints - Array of daily data points
 * @param groupBy - Grouping period: 'day', 'week', or 'month'
 * @returns Regrouped array of data points
 */
export function regroupTimeSeriesData(
  dataPoints: TimeSeriesDataPoint[],
  groupBy: AnalyticsGroupBy
): TimeSeriesDataPoint[] {
  if (groupBy === 'day' || dataPoints.length === 0) {
    return dataPoints;
  }

  const groupedMap = new Map<string, TimeSeriesDataPoint>();

  for (const point of dataPoints) {
    const date = safeParseDateISO(point.date);

    // Skip invalid dates
    if (!date) {
      continue;
    }

    let groupKey: string;
    let groupDate: Date;

    if (groupBy === 'week') {
      groupDate = startOfWeek(date, { locale: ptBR, weekStartsOn: 1 }); // Monday as start of week
      groupKey = format(groupDate, 'yyyy-MM-dd');
    } else if (groupBy === 'month') {
      groupDate = startOfMonth(date);
      groupKey = format(groupDate, 'yyyy-MM-dd');
    } else {
      // Should not happen, but fallback to original
      return dataPoints;
    }

    const existing = groupedMap.get(groupKey);
    if (existing) {
      // Aggregate values
      existing.inputTokens += point.inputTokens;
      existing.outputTokens += point.outputTokens;
      existing.totalTokens += point.totalTokens;
      existing.normalizedTokens += point.normalizedTokens;
      existing.requestCount += point.requestCount;
      existing.uniqueUsers = Math.max(existing.uniqueUsers, point.uniqueUsers);
      existing.uniqueConversations += point.uniqueConversations;
    } else {
      // Create new entry
      groupedMap.set(groupKey, {
        date: groupKey,
        inputTokens: point.inputTokens,
        outputTokens: point.outputTokens,
        totalTokens: point.totalTokens,
        normalizedTokens: point.normalizedTokens,
        requestCount: point.requestCount,
        uniqueUsers: point.uniqueUsers,
        uniqueConversations: point.uniqueConversations,
      });
    }
  }

  // Convert map to array and sort by date
  return Array.from(groupedMap.values()).sort((a, b) => {
    const dateA = safeParseDateISO(a.date);
    const dateB = safeParseDateISO(b.date);

    // Handle invalid dates by putting them at the end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateA.getTime() - dateB.getTime();
  });
}
