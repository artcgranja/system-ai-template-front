/**
 * Formatting utilities
 * Pure functions for formatting values - can be used in both Server and Client components
 */

/**
 * Format token numbers for display
 * @param tokens - Number of tokens
 * @returns Formatted string (e.g., "1.5M", "500K", "1,234")
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toLocaleString('pt-BR');
}

/**
 * Format percentage for display
 * @param value - Percentage value (0-100)
 * @returns Formatted string with % symbol
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(0)}%`;
}

/**
 * Format date for display in pt-BR locale
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format datetime for display in pt-BR locale
 * @param date - Date to format
 * @returns Formatted datetime string
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get color class based on percentage usage
 * @param percentage - Usage percentage (0-100)
 * @returns Tailwind color class
 */
export function getQuotaColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-500';
  if (percentage >= 70) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Get background color class based on percentage usage
 * @param percentage - Usage percentage (0-100)
 * @returns Tailwind background color class
 */
export function getQuotaBackgroundColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}
