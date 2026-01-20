/**
 * Hook to extract and manage markdown headings
 */

import { useMemo } from 'react';
import { extractHeadings, type TOCItem } from '@/lib/utils/markdown';

/**
 * Hook to extract headings from markdown content
 * @param markdown - The markdown content string
 * @returns Array of TOC items with hierarchy
 */
export function useMarkdownHeadings(markdown: string | undefined): TOCItem[] {
  return useMemo(() => {
    if (!markdown) return [];
    return extractHeadings(markdown);
  }, [markdown]);
}
