/**
 * Wiki Search Hook
 * Provides client-side search functionality for wiki content
 */

import { useMemo, useState, useCallback } from 'react';
import type { TOCItem } from '@/lib/utils/markdown';

export interface SearchResult {
  id: string;
  title: string;
  context: string;
  level: number;
}

/**
 * Extract section content for a heading from markdown
 */
function extractSectionContent(markdown: string, headingTitle: string): string {
  // Find the heading in markdown
  const headingPattern = new RegExp(
    `^#{1,4}\\s+${escapeRegex(headingTitle)}\\s*$`,
    'gm'
  );
  const match = headingPattern.exec(markdown);

  if (!match) return '';

  // Get content after the heading until the next heading
  const startIndex = match.index + match[0].length;
  const nextHeadingMatch = markdown.slice(startIndex).match(/^#{1,4}\s+/m);
  const endIndex = nextHeadingMatch
    ? startIndex + (nextHeadingMatch.index || 0)
    : markdown.length;

  const content = markdown.slice(startIndex, endIndex).trim();

  // Clean up markdown and return first 150 chars
  const cleanContent = content
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // Convert links to text
    .replace(/[#*_~`>]/g, '') // Remove markdown symbols
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  return cleanContent.length > 150
    ? cleanContent.slice(0, 150) + '...'
    : cleanContent;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Flatten TOC items to a single array
 */
function flattenTOC(items: TOCItem[]): TOCItem[] {
  const result: TOCItem[] = [];

  function traverse(item: TOCItem) {
    result.push(item);
    if (item.children) {
      item.children.forEach(traverse);
    }
  }

  items.forEach(traverse);
  return result;
}

interface UseWikiSearchOptions {
  markdown: string | undefined;
  headings: TOCItem[];
  debounceMs?: number;
}

interface UseWikiSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  clearSearch: () => void;
}

/**
 * Hook for searching wiki content
 */
export function useWikiSearch({
  markdown,
  headings,
  debounceMs = 300,
}: UseWikiSearchOptions): UseWikiSearchReturn {
  const [query, setQueryInternal] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce query
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryInternal(newQuery);
      setIsSearching(true);

      const timeoutId = setTimeout(() => {
        setDebouncedQuery(newQuery);
        setIsSearching(false);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    },
    [debounceMs]
  );

  // Flatten headings for easier searching
  const flatHeadings = useMemo(() => flattenTOC(headings), [headings]);

  // Build search index with context
  const searchIndex = useMemo(() => {
    if (!markdown) return [];

    return flatHeadings.map((heading) => ({
      id: heading.id,
      title: heading.title,
      level: heading.level,
      context: extractSectionContent(markdown, heading.title),
    }));
  }, [markdown, flatHeadings]);

  // Search results
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const searchTerms = debouncedQuery.toLowerCase().split(/\s+/);

    return searchIndex.filter((item) => {
      const searchText = `${item.title} ${item.context}`.toLowerCase();
      return searchTerms.every((term) => searchText.includes(term));
    });
  }, [debouncedQuery, searchIndex]);

  const clearSearch = useCallback(() => {
    setQueryInternal('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    clearSearch,
  };
}
