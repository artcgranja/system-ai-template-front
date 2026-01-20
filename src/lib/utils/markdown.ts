/**
 * Markdown utilities
 * Functions for parsing and processing markdown content
 */

import GithubSlugger from 'github-slugger';

/**
 * Calculate estimated reading time for markdown content
 * @param markdown - The markdown content string
 * @returns Reading time in minutes
 */
export function calculateReadingTime(markdown: string): number {
  if (!markdown) return 0;

  // Remove markdown syntax for accurate word count
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]*`/g, '') // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // Convert links to text
    .replace(/[#*_~`>]/g, '') // Remove markdown symbols
    .replace(/\|.*\|/g, '') // Remove table syntax
    .replace(/-{3,}/g, '') // Remove horizontal rules
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  // Count words (split by whitespace)
  const words = plainText.split(/\s+/).filter((word) => word.length > 0);
  const wordCount = words.length;

  // Average reading speed: 200 words per minute (conservative)
  const readingTimeMinutes = Math.ceil(wordCount / 200);

  return Math.max(1, readingTimeMinutes); // Minimum 1 minute
}

/**
 * Shared slugger instance for consistent slug generation
 * Uses github-slugger to match rehype-slug's behavior exactly
 */
const slugger = new GithubSlugger();

/**
 * Generate a URL-friendly slug from a string
 * Uses github-slugger to match rehype-slug's behavior exactly
 * This ensures the IDs we generate match the IDs in the rendered HTML
 */
export function generateSlug(text: string): string {
  // Reset slugger to avoid duplicate suffix issues
  slugger.reset();
  return slugger.slug(text);
}

/**
 * Extract headings from markdown content
 */
export interface TOCItem {
  id: string;
  title: string;
  level: number; // 1-4 for h1-h4
  children?: TOCItem[];
}

/**
 * Parse markdown content and extract headings with hierarchy
 * Only includes h1 and h2 headings (main topics, not detailed sections)
 */
export function extractHeadings(markdown: string): TOCItem[] {
  const headingRegex = /^(#{1,2})\s+(.+)$/gm; // Only match h1 and h2
  const headings: TOCItem[] = [];
  const stack: TOCItem[] = [];

  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();
    const id = generateSlug(title);

    const item: TOCItem = {
      id,
      title,
      level,
    };

    // Build hierarchy (only h1 and h2, so h2 can be child of h1)
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      headings.push(item);
    } else {
      const parent = stack[stack.length - 1];
      // Only add as child if parent is h1 and current is h2
      if (parent.level === 1 && level === 2) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(item);
      } else {
        // If not a direct child relationship, add as sibling
        headings.push(item);
      }
    }

    stack.push(item);
  }

  return headings;
}
