import { formatDistanceToNow, format, isToday, isYesterday, isWithinInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Conversation, ConversationGroup } from '@/types/chat';
import { CONVERSATION_GROUPS } from '@/config/constants';

/**
 * Format date relative to now
 */
export function formatRelativeDate(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
}

/**
 * Format date with custom format
 */
export function formatDate(date: Date, formatStr: string = 'PPP'): string {
  return format(date, formatStr, { locale: ptBR });
}

/**
 * Group conversations by date
 */
export function groupConversationsByDate(conversations: Conversation[]): ConversationGroup[] {
  // Guard against undefined or null conversations
  if (!conversations || !Array.isArray(conversations)) {
    return [];
  }

  const groups: Record<string, Conversation[]> = {
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  };

  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const thirtyDaysAgo = subDays(now, 30);

  conversations.forEach((conversation) => {
    const date = new Date(conversation.updatedAt);

    if (isToday(date)) {
      groups.today.push(conversation);
    } else if (isYesterday(date)) {
      groups.yesterday.push(conversation);
    } else if (isWithinInterval(date, { start: sevenDaysAgo, end: now })) {
      groups.lastWeek.push(conversation);
    } else if (isWithinInterval(date, { start: thirtyDaysAgo, end: now })) {
      groups.lastMonth.push(conversation);
    } else {
      groups.older.push(conversation);
    }
  });

  // Sort each group by updatedAt (newest first)
  Object.keys(groups).forEach((key) => {
    groups[key].sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  });

  return [
    { label: CONVERSATION_GROUPS.today, conversations: groups.today },
    { label: CONVERSATION_GROUPS.yesterday, conversations: groups.yesterday },
    { label: CONVERSATION_GROUPS.lastWeek, conversations: groups.lastWeek },
    { label: CONVERSATION_GROUPS.lastMonth, conversations: groups.lastMonth },
    { label: CONVERSATION_GROUPS.older, conversations: groups.older },
  ].filter((group) => group.conversations.length > 0);
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
