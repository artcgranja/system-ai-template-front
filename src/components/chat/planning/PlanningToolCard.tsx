'use client';

import React from 'react';
import { CreatePlanCard } from './CreatePlanCard';
import { ReviewPlanCard } from './ReviewPlanCard';
import { PlanStatusCard } from './PlanStatusCard';
import { PresentationResultCard } from './PresentationResultCard';
import type { PlanningToolResult, PlanningToolName } from '@/types/planning';

interface PlanningToolCardProps {
  toolName: PlanningToolName;
  result: PlanningToolResult;
  isStreaming?: boolean;
}

/**
 * Router component that decides which planning tool card to render
 * Based on the tool name from the SSE event
 *
 * Priority:
 * 1. If gamma_result exists (presentation generated), show PresentationResultCard
 * 2. Otherwise, route based on tool name
 */
export function PlanningToolCard({
  toolName,
  result,
  isStreaming,
}: PlanningToolCardProps) {
  // If presentation was generated, show the presentation result card
  if (result.gamma_result && !isStreaming) {
    return <PresentationResultCard result={result} />;
  }

  switch (toolName) {
    case 'create_plan':
    case 'edit_plan':
    case 'request_plan_approval':
      return <CreatePlanCard result={result} isStreaming={isStreaming} />;

    case 'reject_plan':
      return <ReviewPlanCard result={result} isStreaming={isStreaming} />;

    case 'get_active_plan':
      return <PlanStatusCard result={result} />;

    case 'generate_presentation':
    case 'approve_plan':
      return <PresentationResultCard result={result} />;

    default:
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Tool desconhecida: {toolName}
          </p>
        </div>
      );
  }
}
