'use client';

import { memo, useState, useDeferredValue } from 'react';
import { Loader2, Wrench, ChevronDown, ChevronRight } from 'lucide-react';
import type { ToolCall } from '@/types/chat';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from './planning/MarkdownRenderer';
import { CollapsibleMarkdownPreview } from './planning/CollapsibleMarkdownPreview';
import { isPlanningTool } from '@/lib/utils/planningTools';

interface ToolCallIndicatorProps {
  toolCall: ToolCall;
}

// Custom comparison for ToolCallIndicator memo
function areToolCallIndicatorPropsEqual(
  prevProps: ToolCallIndicatorProps,
  nextProps: ToolCallIndicatorProps
): boolean {
  // Re-render if tool call id changes
  if (prevProps.toolCall.id !== nextProps.toolCall.id) return false;

  // Re-render if status changes
  if (prevProps.toolCall.status !== nextProps.toolCall.status) return false;

  // Re-render if streaming content changes
  if (prevProps.toolCall.streamingContent !== nextProps.toolCall.streamingContent) return false;

  // Props are equal, skip re-render
  return true;
}

export const ToolCallIndicator = memo(function ToolCallIndicator({ toolCall }: ToolCallIndicatorProps) {
  const isRunning = toolCall.status === 'running' || toolCall.status === 'starting';
  const hasStreamingContent = !!toolCall.streamingContent;
  const isPlanning = isPlanningTool(toolCall.tool_name);

  // Defer markdown rendering to keep UI responsive during streaming
  const deferredStreamingContent = useDeferredValue(toolCall.streamingContent);

  // Auto-expand when there's streaming content
  const [isExpanded, setIsExpanded] = useState(true);

  // Format tool name for display (snake_case to Title Case)
  const displayName = toolCall.tool_name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Simple indicator without streaming content
  if (!hasStreamingContent) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
          'bg-muted/50 border border-border/50',
          'text-foreground/80'
        )}
      >
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Wrench className="h-4 w-4 text-muted-foreground" />
        )}

        <span className="font-medium">
          {isRunning ? 'Executando' : 'Usando'} {displayName}
        </span>

        {/* Show loading dots for running state */}
        {isRunning && (
          <span className="flex gap-0.5">
            <span className="animate-bounce delay-0">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </span>
        )}
      </div>
    );
  }

  // Expanded indicator with streaming content
  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        'bg-muted/30 border-primary/30'
      )}
    >
      {/* Header - Clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5',
          'hover:bg-muted/50 transition-colors',
          'text-left'
        )}
      >
        {/* Loading Icon */}
        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />

        {/* Tool name */}
        <span className="font-medium text-sm text-foreground/90 flex-1">
          Executando {displayName}
        </span>

        {/* Loading dots */}
        <span className="flex gap-0.5 text-muted-foreground">
          <span className="animate-bounce delay-0">.</span>
          <span className="animate-bounce delay-100">.</span>
          <span className="animate-bounce delay-200">.</span>
        </span>

        {/* Expand/Collapse icon */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Streaming Content - Collapsible */}
      {isExpanded && deferredStreamingContent && (
        <div className="border-t border-border/50 bg-background/50">
          {isPlanning ? (
            <CollapsibleMarkdownPreview
              markdown={deferredStreamingContent}
              isStreaming={true}
              className="border-0 rounded-none"
            />
          ) : (
            <div className="px-3 py-3">
              <MarkdownRenderer markdown={deferredStreamingContent} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}, areToolCallIndicatorPropsEqual);
