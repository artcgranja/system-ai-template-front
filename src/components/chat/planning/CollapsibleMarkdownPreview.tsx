'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { MarkdownRenderer } from './MarkdownRenderer';
import { cn } from '@/lib/utils';

interface CollapsibleMarkdownPreviewProps {
  markdown: string;
  defaultExpanded?: boolean;
  className?: string;
  previewLines?: number;
  /** When true, always show collapsible wrapper regardless of content length */
  isStreaming?: boolean;
}

/**
 * Extract a preview from markdown content
 * Returns the first heading and a summary of the content
 */
function extractPreview(markdown: string, maxLines: number = 3): { title: string | null; summary: string } {
  const lines = markdown.split('\n').filter(line => line.trim() !== '');

  let title: string | null = null;
  const contentLines: string[] = [];

  for (const line of lines) {
    // Extract first heading as title
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch && !title) {
      title = headingMatch[1].trim();
      continue;
    }

    // Skip code blocks for preview
    if (line.startsWith('```')) {
      continue;
    }

    // Collect content lines
    if (contentLines.length < maxLines) {
      // Clean up markdown formatting for preview
      const cleanLine = line
        .replace(/^\*\*(.+)\*\*$/, '$1') // Remove bold wrapping
        .replace(/^[-*]\s+/, '• ') // Convert list markers
        .replace(/^\d+\.\s+/, '• '); // Convert numbered lists

      contentLines.push(cleanLine);
    }
  }

  return {
    title,
    summary: contentLines.join(' ').slice(0, 200) + (contentLines.join(' ').length > 200 ? '...' : ''),
  };
}

/**
 * Collapsible component for displaying markdown content with preview
 * Shows a summarized view by default with option to expand in a dialog
 */
export function CollapsibleMarkdownPreview({
  markdown,
  defaultExpanded = false,
  className,
  previewLines = 3,
  isStreaming = false,
}: CollapsibleMarkdownPreviewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(defaultExpanded);

  const { title } = useMemo(
    () => extractPreview(markdown, previewLines),
    [markdown, previewLines]
  );

  // Check if content is short enough to not need collapsing
  // When streaming, always use collapsible to maintain consistent UI
  const lineCount = markdown.split('\n').filter(line => line.trim() !== '').length;
  const isShortContent = !isStreaming && lineCount <= previewLines + 1;

  if (!markdown || markdown.trim() === '') {
    return (
      <div className={cn('text-sm text-muted-foreground py-4 text-center', className)}>
        Conteúdo do plano não disponível
      </div>
    );
  }

  // If content is short, just show it without collapsible
  if (isShortContent) {
    return (
      <div className={cn('bg-background rounded-lg border border-border/50 p-4', className)}>
        <MarkdownRenderer markdown={markdown} />
      </div>
    );
  }

  return (
    <div className={cn('bg-background rounded-lg border border-border/50 overflow-hidden', className)}>
      {/* Preview with rendered markdown - always visible, limited height */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        <MarkdownRenderer markdown={markdown} />
      </div>

      {/* Expand trigger - opens dialog for full view */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full rounded-none border-t border-border/50 h-9 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
            Ver plano completo
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b border-border">
            <DialogTitle>{title || 'Plano Completo'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            <MarkdownRenderer markdown={markdown} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
