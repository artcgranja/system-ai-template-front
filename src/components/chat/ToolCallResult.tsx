'use client';

import { memo, useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Wrench, Loader2 } from 'lucide-react';
import type { ToolCall } from '@/types/chat';
import { cn } from '@/lib/utils';
import { ToolResultViewer } from './ToolResultViewer';
import { parseToolResult, canDisplayAsChart } from '@/lib/utils/toolResultParser';
import { isPlanningTool } from '@/lib/utils/planningTools';

interface ToolCallResultProps {
  toolCall: ToolCall;
}

// Custom comparison for ToolCallResult memo
function areToolCallResultPropsEqual(
  prevProps: ToolCallResultProps,
  nextProps: ToolCallResultProps
): boolean {
  // Re-render if tool call id changes
  if (prevProps.toolCall.id !== nextProps.toolCall.id) return false;

  // Re-render if status changes
  if (prevProps.toolCall.status !== nextProps.toolCall.status) return false;

  // Re-render if result changes
  if (prevProps.toolCall.result !== nextProps.toolCall.result) return false;

  // Re-render if streamingContent changes (for planning tools)
  if (prevProps.toolCall.streamingContent !== nextProps.toolCall.streamingContent) return false;

  // Re-render if error changes
  if (prevProps.toolCall.error !== nextProps.toolCall.error) return false;

  // Props are equal, skip re-render
  return true;
}

export const ToolCallResult = memo(function ToolCallResult({ toolCall }: ToolCallResultProps) {
  const isCompleted = toolCall.status === 'completed';
  const isError = toolCall.status === 'error';
  const isRunning = toolCall.status === 'running';

  // Check if result can be displayed as chart to determine initial expanded state
  // Planning tools should always be expanded by default
  const isPlanning = isPlanningTool(toolCall.tool_name);
  const canDisplayChart = useMemo(() => {
    if (isError || !toolCall.result) return false;
    
    try {
      const parsed = parseToolResult(toolCall.result);
      return canDisplayAsChart(parsed, toolCall.tool_name);
    } catch {
      return false;
    }
  }, [toolCall.result, toolCall.tool_name, isError]);

  const [isExpanded, setIsExpanded] = useState(isPlanning || canDisplayChart);

  // Format tool name for display (snake_case to Title Case)
  const displayName = toolCall.tool_name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Format execution time
  const executionTime = toolCall.execution_time
    ? `${toolCall.execution_time.toFixed(2)}s`
    : null;

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        'bg-muted/30',
        isCompleted && 'border-green-500/30',
        isError && 'border-red-500/30',
        isRunning && 'border-primary/30',
        !isCompleted && !isError && !isRunning && 'border-border/50'
      )}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5',
          'hover:bg-muted/50 transition-colors',
          'text-left'
        )}
      >
        {/* Icon */}
        <div className="flex-shrink-0">
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : isError ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : isRunning ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Wrench className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {/* Tool name */}
        <span className="font-medium text-sm text-foreground/90 flex-1">
          {displayName}
        </span>

        {/* Execution time */}
        {executionTime && (
          <span className="text-xs text-muted-foreground/60">
            {executionTime}
          </span>
        )}

        {/* Expand/Collapse icon */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="px-3 py-2 border-t border-border/50 bg-background/50">
          {/* Arguments - Hide for planning tools */}
          {!isPlanning && toolCall.arguments && Object.keys(toolCall.arguments).length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Argumentos
              </span>
              <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-x-auto">
                <code>{JSON.stringify(toolCall.arguments, null, 2)}</code>
              </pre>
            </div>
          )}

          {/* Loading state for running tools */}
          {/* For planning tools, show loading even if there's an interrupt status result (which is hidden) */}
          {isRunning && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isPlanning ? 'Gerando apresentação...' : 'Processando...'}</span>
            </div>
          )}

          {/* Result or Error - Show streaming content for planning tools */}
          {/* Don't show result section when running (loading state is shown above) */}
          {!isRunning && (toolCall.result || toolCall.error || (isPlanning && toolCall.streamingContent)) && (
            <div>
              {!isPlanning && (
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  {isError ? 'Erro' : 'Resultado'}
                </span>
              )}
              <ToolResultViewer
                result={
                  isError
                    ? toolCall.error || ''
                    : isPlanning && toolCall.streamingContent
                      ? toolCall.streamingContent
                      : toolCall.result || ''
                }
                isError={isError}
                toolName={toolCall.tool_name}
                isStreaming={isPlanning && !!toolCall.streamingContent}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}, areToolCallResultPropsEqual);
