'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { reactMarkdownComponents } from '@/lib/markdown';

interface MarkdownRendererProps {
  markdown: string;
  className?: string;
}

/**
 * Component to render markdown content for planning tools
 * Supports GitHub Flavored Markdown and syntax highlighting for code blocks
 * Uses shared markdown components configuration
 */
export function MarkdownRenderer({ markdown, className }: MarkdownRendererProps) {
  if (!markdown || markdown.trim() === '') {
    return (
      <div className={cn('text-sm text-muted-foreground py-4', className)}>
        Nenhum conteúdo disponível
      </div>
    );
  }

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={reactMarkdownComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
