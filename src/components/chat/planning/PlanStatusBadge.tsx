'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { PlanStatus } from '@/types/planning';

interface PlanStatusBadgeProps {
  status: PlanStatus;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Badge component to display plan status with appropriate colors
 */
export function PlanStatusBadge({ status, size = 'medium' }: PlanStatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: 'Rascunho',
      className: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
    },
    pending_approval: {
      label: 'Aguardando Aprovação',
      className: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
    },
    approved: {
      label: 'Aprovado',
      className: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
    },
    rejected: {
      label: 'Rejeitado',
      className: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
    },
    revised: {
      label: 'Revisado',
      className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
    },
    executed: {
      label: 'Executado',
      className: 'bg-gray-600/20 text-gray-800 dark:text-gray-200 border-gray-600/30',
    },
  };

  const sizeClasses = {
    small: 'text-xs px-2 py-0.5',
    medium: 'text-sm px-2.5 py-1',
    large: 'text-base px-3 py-1.5',
  };

  const config = statusConfig[status];

  // Fallback for unknown status
  if (!config) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-md border font-medium',
          'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
          sizeClasses[size]
        )}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        config.className,
        sizeClasses[size]
      )}
    >
      {config.label}
    </span>
  );
}
