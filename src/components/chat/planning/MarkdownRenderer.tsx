'use client';

import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/chat/CodeBlock';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  markdown: string;
  className?: string;
}

/**
 * Component to render markdown content for planning tools
 * Supports GitHub Flavored Markdown and syntax highlighting for code blocks
 */
export function MarkdownRenderer({ markdown, className }: MarkdownRendererProps) {
  const components: Components = {
    // Paragraphs
    p: ({ children }) => (
      <p className="mb-4 last:mb-0 text-[15px] leading-[1.75] text-foreground dark:text-foreground/90">
        {children}
      </p>
    ),
    // Lists
    ul: ({ children }) => (
      <ul className="mb-4 ml-6 list-disc space-y-2 marker:text-muted-foreground/60">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-2 marker:text-muted-foreground/60">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-[1.75] text-[15px] text-foreground dark:text-foreground/90 pl-2">
        {children}
      </li>
    ),
    // Headings
    h1: ({ children }) => (
      <h1 className="mb-4 mt-6 text-2xl font-semibold tracking-tight text-foreground dark:text-foreground first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-5 text-[20px] font-semibold tracking-tight text-foreground dark:text-foreground first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-4 text-[18px] font-semibold tracking-tight text-foreground dark:text-foreground first:mt-0">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-3 text-base font-semibold tracking-tight text-foreground dark:text-foreground first:mt-0">
        {children}
      </h4>
    ),
    // Code blocks with syntax highlighting
    code: ({ className, children }) => {
      const match = /language-(\w+)/.exec(className || '');
      const inline = !match;
      const code = String(children).replace(/\n$/, '');

      if (inline) {
        return <CodeBlock code={code} inline className={className} />;
      }

      // Special highlighting for JSON blocks (important for Gamma AI)
      const language = match ? match[1] : 'text';
      return (
        <CodeBlock language={language} code={code} />
      );
    },
    pre: ({ children }) => <>{children}</>,
    // Links
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline font-medium"
      >
        {children}
      </a>
    ),
    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4">
        {children}
      </blockquote>
    ),
    // Horizontal rule
    hr: () => <hr className="my-6 border-border" />,
    // Tables with GitHub Flavored Markdown support
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-border">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="even:bg-muted/30">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground dark:text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-3 py-2 text-sm text-foreground dark:text-foreground">{children}</td>
    ),
    // Strong and emphasis
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-foreground">{children}</em>
    ),
  };

  if (!markdown || markdown.trim() === '') {
    return (
      <div className={cn('text-sm text-muted-foreground py-4', className)}>
        Nenhum conteúdo disponível
      </div>
    );
  }

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
