'use client';

import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAlerts } from '@/lib/hooks/useAlerts';

interface AlertsBadgeProps {
  className?: string;
  onClick?: () => void;
}

export function AlertsBadge({ className, onClick }: AlertsBadgeProps) {
  const { unreadCount, hasUnreadAlerts } = useAlerts();

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-md hover:bg-accent transition-colors',
        className
      )}
      aria-label={`Alertas${hasUnreadAlerts ? ` (${unreadCount} nao lidos)` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {hasUnreadAlerts && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </span>
      )}
    </button>
  );
}

export default AlertsBadge;
