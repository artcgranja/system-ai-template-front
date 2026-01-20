'use client';

import React from 'react';
import { CollapsibleMarkdownPreview } from './CollapsibleMarkdownPreview';
import type { PlanningToolResult } from '@/types/planning';

interface PlanStatusCardProps {
  result: PlanningToolResult;
}

/**
 * Component for plan status tool results (get_active_plan)
 * Displays plan markdown content with expand option
 */
export function PlanStatusCard({ result }: PlanStatusCardProps) {
  if (!result.success) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4">
        <p className="text-red-800 dark:text-red-300 font-medium">{result.message}</p>
        {result.error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">{result.error}</p>
        )}
      </div>
    );
  }

  return <CollapsibleMarkdownPreview markdown={result.markdown || ''} />;
}
