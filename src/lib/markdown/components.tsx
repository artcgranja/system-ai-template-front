'use client';

import type { Components } from 'react-markdown';
import { CodeBlock } from '@/components/chat/CodeBlock';

/**
 * Shared Tailwind classes for markdown elements
 * Used by both Incremark and react-markdown renderers
 */
export const markdownStyles = {
  // Paragraphs
  p: 'mb-4 last:mb-0 text-[15px] leading-[1.75] text-foreground dark:text-foreground/90',

  // Lists
  ul: 'mb-4 ml-6 list-disc space-y-2 marker:text-muted-foreground/60',
  ol: 'mb-4 ml-6 list-decimal space-y-2 marker:text-muted-foreground/60',
  li: 'leading-[1.75] text-[15px] text-foreground dark:text-foreground/90 pl-2',

  // Headings
  h1: 'mb-4 mt-6 text-2xl font-semibold tracking-tight text-foreground dark:text-foreground first:mt-0',
  h2: 'mb-3 mt-5 text-[20px] font-semibold tracking-tight text-foreground dark:text-foreground first:mt-0',
  h3: 'mb-3 mt-4 text-[18px] font-semibold tracking-tight text-foreground dark:text-foreground first:mt-0',
  h4: 'mb-2 mt-3 text-base font-semibold tracking-tight text-foreground dark:text-foreground first:mt-0',

  // Links
  a: 'text-primary hover:underline font-medium',

  // Blockquote
  blockquote: 'border-l-4 border-primary/30 pl-4 italic text-muted-foreground my-4',

  // Horizontal rule
  hr: 'my-6 border-border',

  // Tables
  tableWrapper: 'my-4 overflow-x-auto',
  table: 'min-w-full divide-y divide-border',
  thead: 'bg-muted/50',
  tbody: 'divide-y divide-border',
  tr: 'even:bg-muted/30',
  th: 'px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground dark:text-foreground',
  td: 'px-3 py-2 text-sm text-foreground dark:text-foreground',

  // Emphasis
  strong: 'font-semibold text-foreground',
  em: 'italic text-foreground',
} as const;

/**
 * Components configuration for react-markdown
 * Used in MarkdownRenderer.tsx and other non-streaming contexts
 */
export const reactMarkdownComponents: Components = {
  // Paragraphs
  p: ({ children }) => (
    <p className={markdownStyles.p}>{children}</p>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className={markdownStyles.ul}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className={markdownStyles.ol}>{children}</ol>
  ),
  li: ({ children }) => (
    <li className={markdownStyles.li}>{children}</li>
  ),

  // Headings
  h1: ({ children }) => (
    <h1 className={markdownStyles.h1}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className={markdownStyles.h2}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className={markdownStyles.h3}>{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className={markdownStyles.h4}>{children}</h4>
  ),

  // Code blocks with syntax highlighting
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || '');
    const inline = !match;
    const code = String(children).replace(/\n$/, '');

    if (inline) {
      return <CodeBlock code={code} inline className={className} />;
    }

    return <CodeBlock language={match ? match[1] : 'text'} code={code} />;
  },
  pre: ({ children }) => <>{children}</>,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={markdownStyles.a}
    >
      {children}
    </a>
  ),

  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className={markdownStyles.blockquote}>{children}</blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className={markdownStyles.hr} />,

  // Tables with GitHub Flavored Markdown support
  table: ({ children }) => (
    <div className={markdownStyles.tableWrapper}>
      <table className={markdownStyles.table}>{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className={markdownStyles.thead}>{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className={markdownStyles.tbody}>{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className={markdownStyles.tr}>{children}</tr>
  ),
  th: ({ children }) => (
    <th className={markdownStyles.th}>{children}</th>
  ),
  td: ({ children }) => (
    <td className={markdownStyles.td}>{children}</td>
  ),

  // Strong and emphasis
  strong: ({ children }) => (
    <strong className={markdownStyles.strong}>{children}</strong>
  ),
  em: ({ children }) => (
    <em className={markdownStyles.em}>{children}</em>
  ),
};

/**
 * Prose classes for markdown container
 * Apply these to the wrapper div around markdown content
 */
export const proseClasses = `
  prose prose-sm dark:prose-invert max-w-none break-words
  prose-p:leading-[1.75] prose-p:text-foreground dark:prose-p:text-foreground/90 prose-p:text-[15px]
  prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-foreground dark:prose-headings:text-foreground
  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  prose-code:text-foreground dark:prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0
  prose-strong:font-semibold prose-strong:text-foreground dark:prose-strong:text-foreground
  prose-em:text-foreground dark:prose-em:text-foreground
  prose-ul:my-3 prose-ol:my-3
  prose-li:text-foreground dark:prose-li:text-foreground
`.trim().replace(/\s+/g, ' ');
