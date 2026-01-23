'use client';

import { memo, useMemo } from 'react';
import { IncremarkContent, ThemeProvider, type DesignTokens } from '@incremark/react';
import '@incremark/theme/styles.css';
import { useTheme } from 'next-themes';
import { CodeBlock } from './CodeBlock';
import { cn } from '@/lib/utils';

interface StreamingMarkdownProps {
  /** Markdown content to render */
  content: string;
  /** Whether the content is still being streamed */
  isStreaming?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Custom theme that uses system CSS variables
 * Maps Incremark tokens to our Tailwind/shadcn design system
 */
function createCustomTheme(isDark: boolean): Partial<DesignTokens> {
  // We use CSS variable references so colors adapt automatically
  // Note: These are computed at render time based on the current theme
  return {
    color: {
      neutral: {
        1: isDark ? 'hsl(240 5% 13%)' : 'hsl(210 33% 98%)',      // background
        2: isDark ? 'hsl(240 5% 18%)' : 'hsl(0 0% 100%)',        // card
        3: isDark ? 'hsl(240 5% 18%)' : 'hsl(210 33% 95%)',      // muted
        4: isDark ? 'hsl(240 5% 25%)' : 'hsl(210 33% 90%)',      // border
        5: isDark ? 'hsl(240 5% 25%)' : 'hsl(210 33% 90%)',      // border
        6: isDark ? 'hsl(240 5% 63%)' : 'hsl(210 33% 58%)',      // muted-foreground
        7: isDark ? 'hsl(240 5% 63%)' : 'hsl(210 33% 58%)',      // muted-foreground
        8: isDark ? 'hsl(240 5% 96%)' : 'hsl(210 33% 23%)',      // foreground
        9: isDark ? 'hsl(240 5% 96%)' : 'hsl(210 33% 23%)',      // foreground
        10: isDark ? 'hsl(240 5% 96%)' : 'hsl(210 33% 23%)',     // foreground
      },
      brand: {
        primary: isDark ? 'hsl(213 33% 56%)' : 'hsl(213 33% 46%)',           // primary (Astro Steel Blue)
        primaryHover: isDark ? 'hsl(213 33% 46%)' : 'hsl(213 33% 40%)',
        primaryActive: isDark ? 'hsl(213 33% 40%)' : 'hsl(213 33% 35%)',
        primaryLight: isDark ? 'hsl(213 33% 56% / 0.1)' : 'hsl(213 33% 46% / 0.1)',
      },
      text: {
        primary: isDark ? 'hsl(240 5% 96%)' : 'hsl(210 33% 23%)',            // foreground
        secondary: isDark ? 'hsl(240 5% 63%)' : 'hsl(210 33% 58%)',          // muted-foreground
        tertiary: isDark ? 'hsl(240 5% 63% / 0.7)' : 'hsl(210 33% 58% / 0.7)',
        inverse: isDark ? 'hsl(240 5% 13%)' : 'hsl(0 0% 100%)',
      },
      background: {
        base: 'transparent',  // Keep transparent to inherit from parent
        elevated: isDark ? 'hsl(240 5% 18%)' : 'hsl(0 0% 100%)',             // card
        overlay: isDark ? 'hsl(240 5% 13% / 0.8)' : 'hsl(210 33% 98% / 0.8)',
      },
      border: {
        subtle: isDark ? 'hsl(240 5% 25% / 0.5)' : 'hsl(210 33% 90% / 0.5)',
        default: isDark ? 'hsl(240 5% 25%)' : 'hsl(210 33% 90%)',            // border
        strong: isDark ? 'hsl(240 5% 96% / 0.3)' : 'hsl(210 33% 23% / 0.3)',
      },
      code: {
        inlineBackground: isDark ? 'hsl(240 5% 18%)' : 'hsl(210 33% 95%)',   // muted
        inlineText: isDark ? 'hsl(240 5% 96%)' : 'hsl(210 33% 23%)',         // foreground
        blockBackground: isDark ? 'hsl(240 5% 18%)' : 'hsl(210 33% 95%)',
        blockText: isDark ? 'hsl(240 5% 96%)' : 'hsl(210 33% 23%)',
        headerBackground: isDark ? 'hsl(240 5% 13%)' : 'hsl(210 33% 90%)',
      },
      status: {
        pending: isDark ? 'hsl(213 33% 56%)' : 'hsl(213 33% 46%)',           // primary (streaming indicator)
        completed: 'hsl(154 100% 48%)',                                       // success green
      },
      interactive: {
        link: isDark ? 'hsl(213 33% 56%)' : 'hsl(213 33% 46%)',              // primary
        linkHover: isDark ? 'hsl(213 33% 46%)' : 'hsl(213 33% 40%)',
        linkVisited: isDark ? 'hsl(213 33% 46%)' : 'hsl(213 33% 56%)',       // accent
        checked: isDark ? 'hsl(213 33% 56%)' : 'hsl(213 33% 46%)',           // primary
      },
    },
  };
}

/**
 * High-performance streaming markdown renderer using Incremark
 *
 * Uses O(n) incremental parsing instead of O(n²) full re-parsing,
 * providing significant performance improvements for streaming scenarios.
 *
 * @see https://www.incremark.com/
 */
export const StreamingMarkdown = memo(function StreamingMarkdown({
  content,
  isStreaming = false,
  className,
}: StreamingMarkdownProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Memoize custom theme to avoid recreating on every render
  const customTheme = useMemo(() => createCustomTheme(isDark), [isDark]);

  // Don't render if no content
  if (!content) {
    return null;
  }

  return (
    <ThemeProvider theme={customTheme}>
      <div
        className={cn(
          // Base prose styles
          'prose prose-sm dark:prose-invert max-w-none break-words',
          // Text styles
          'prose-p:leading-[1.75] prose-p:text-[15px]',
          // Heading styles
          'prose-headings:font-semibold prose-headings:tracking-tight',
          // Link styles
          'prose-a:no-underline hover:prose-a:underline',
          // Code styles
          'prose-code:before:content-none prose-code:after:content-none',
          'prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0',
          // List styles
          'prose-ul:my-3 prose-ol:my-3',
          // Custom classes
          className
        )}
      >
        <IncremarkContent
          content={content}
          isFinished={!isStreaming}
          customCodeBlocks={{
            // Route all code blocks to our custom CodeBlock component
            default: ({ codeStr, lang }) => (
              <CodeBlock
                language={lang || 'text'}
                code={codeStr}
              />
            ),
          }}
        />
      </div>
    </ThemeProvider>
  );
});

StreamingMarkdown.displayName = 'StreamingMarkdown';
