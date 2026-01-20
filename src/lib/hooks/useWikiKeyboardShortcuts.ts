/**
 * Wiki Keyboard Shortcuts Hook
 * Provides keyboard navigation for wiki pages
 */

import { useEffect, useCallback } from 'react';
import type { TOCItem } from '@/lib/utils/markdown';

interface UseWikiKeyboardShortcutsOptions {
  headings: TOCItem[];
  activeId: string;
  onFocusSearch?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

/**
 * Flatten TOC items to get all heading IDs in order
 */
function getAllHeadingIds(items: TOCItem[]): string[] {
  const result: string[] = [];

  function traverse(item: TOCItem) {
    result.push(item.id);
    if (item.children) {
      item.children.forEach(traverse);
    }
  }

  items.forEach(traverse);
  return result;
}

/**
 * Scroll to a heading by ID
 */
function scrollToHeading(id: string) {
  const element = document.getElementById(id);
  if (element) {
    const headerOffset = 100;
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });
  }
}

/**
 * Hook for wiki keyboard shortcuts
 *
 * Shortcuts:
 * - / : Focus search
 * - j or ArrowDown : Next section
 * - k or ArrowUp : Previous section
 * - t or Home : Go to top
 * - ? : Show help
 */
export function useWikiKeyboardShortcuts({
  headings,
  activeId,
  onFocusSearch,
  onShowHelp,
  enabled = true,
}: UseWikiKeyboardShortcutsOptions) {
  const allIds = getAllHeadingIds(headings);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow escape to blur input
        if (event.key === 'Escape') {
          target.blur();
        }
        return;
      }

      switch (event.key) {
        case '/':
          event.preventDefault();
          onFocusSearch?.();
          break;

        case 'j':
        case 'ArrowDown':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            const currentIndex = allIds.indexOf(activeId);
            const nextIndex = Math.min(currentIndex + 1, allIds.length - 1);
            if (nextIndex >= 0 && allIds[nextIndex]) {
              scrollToHeading(allIds[nextIndex]);
            }
          }
          break;

        case 'k':
        case 'ArrowUp':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            const currentIdx = allIds.indexOf(activeId);
            const prevIndex = Math.max(currentIdx - 1, 0);
            if (prevIndex >= 0 && allIds[prevIndex]) {
              scrollToHeading(allIds[prevIndex]);
            }
          }
          break;

        case 't':
        case 'Home':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;

        case '?':
          if (event.shiftKey) {
            event.preventDefault();
            onShowHelp?.();
          }
          break;

        case 'Escape':
          // Blur any focused element
          (document.activeElement as HTMLElement)?.blur?.();
          break;
      }
    },
    [allIds, activeId, onFocusSearch, onShowHelp]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Keyboard shortcuts configuration for display
 */
export const WIKI_KEYBOARD_SHORTCUTS = [
  { key: '/', description: 'Focar busca' },
  { key: 'j / ↓', description: 'Próxima seção' },
  { key: 'k / ↑', description: 'Seção anterior' },
  { key: 't', description: 'Voltar ao topo' },
  { key: 'Shift + ?', description: 'Mostrar atalhos' },
  { key: 'Esc', description: 'Fechar/desfocar' },
];
