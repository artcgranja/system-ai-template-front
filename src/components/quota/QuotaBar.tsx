'use client';

import { cn } from '@/lib/utils';
import { useQuota } from '@/lib/hooks/useQuota';
import { Zap, Infinity, AlertTriangle } from 'lucide-react';

interface QuotaBarProps {
  collapsed?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function QuotaBar({ collapsed = false, className, showLabel = true }: QuotaBarProps) {
  const { quota, isLoading, formatTokens, getQuotaColor, isUnlimited, isSuspended } = useQuota();

  if (isLoading || !quota) {
    return (
      <div className={cn('animate-pulse', className)}>
        <div className="h-2 bg-muted rounded-full" />
      </div>
    );
  }

  // Handle unlimited users
  if (isUnlimited) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Infinity className="h-4 w-4 text-primary" />
        {!collapsed && showLabel && (
          <span className="text-xs text-muted-foreground">Cota ilimitada</span>
        )}
      </div>
    );
  }

  // Handle suspended users
  if (isSuspended) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <AlertTriangle className="h-4 w-4 text-destructive" />
        {!collapsed && showLabel && (
          <span className="text-xs text-destructive">Conta suspensa</span>
        )}
      </div>
    );
  }

  const percentage = Math.min(quota.percentageUsed, 100);
  const color = getQuotaColor(percentage);

  // Harmonious colors with Astro theme
  const barColorClass = {
    green: 'bg-emerald-500',           // Emerald green - harmonious with Astro
    yellow: 'bg-amber-500',            // Amber/orange - complementary to Astro blue
    red: 'bg-rose-500',                // Rose red - warm accent
  }[color];

  const textColorClass = {
    green: 'text-emerald-600 dark:text-emerald-400',
    yellow: 'text-amber-600 dark:text-amber-400',
    red: 'text-rose-600 dark:text-rose-400',
  }[color];

  if (collapsed) {
    // Collapsed view - just show an icon with color
    return (
      <div className={cn('flex items-center justify-center', className)} title={`${percentage.toFixed(0)}% usado`}>
        <div className={cn('w-2 h-2 rounded-full', barColorClass)} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Zap className="h-3 w-3" />
            Tokens
          </span>
          <span className={cn('font-medium', textColorClass)}>
            {formatTokens(quota.remaining)} restantes
          </span>
        </div>
      )}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-300 rounded-full', barColorClass)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatTokens(quota.currentUsage)} usados</span>
          <span>{formatTokens(quota.quotaLimit)} total</span>
        </div>
      )}
    </div>
  );
}

export default QuotaBar;
