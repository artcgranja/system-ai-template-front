'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TOCItem } from '@/lib/utils/markdown';

interface SectionNavigationProps {
  headings: TOCItem[];
  activeId: string;
  className?: string;
}

/**
 * Get all heading IDs in order (flattened)
 */
function getAllHeadingIds(items: TOCItem[]): { id: string; title: string }[] {
  const result: { id: string; title: string }[] = [];

  function traverse(item: TOCItem) {
    result.push({ id: item.id, title: item.title });
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

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setTimeout(() => {
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }, 100);
  }
}

/**
 * Section navigation component
 * Shows previous/next section links at the bottom of the content
 */
export function SectionNavigation({
  headings,
  activeId,
  className,
}: SectionNavigationProps) {
  const allHeadings = useMemo(() => getAllHeadingIds(headings), [headings]);

  const { prevSection, nextSection } = useMemo(() => {
    const currentIndex = allHeadings.findIndex((h) => h.id === activeId);

    return {
      prevSection: currentIndex > 0 ? allHeadings[currentIndex - 1] : null,
      nextSection:
        currentIndex < allHeadings.length - 1
          ? allHeadings[currentIndex + 1]
          : null,
    };
  }, [allHeadings, activeId]);

  if (!prevSection && !nextSection) {
    return null;
  }

  return (
    <nav
      className={cn(
        'flex items-center justify-between gap-4 pt-8 mt-8 border-t border-border',
        className
      )}
      aria-label="Navegação entre seções"
    >
      {prevSection ? (
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-left max-w-[45%]"
          onClick={() => scrollToHeading(prevSection.id)}
        >
          <ChevronLeft className="h-4 w-4 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground block">Anterior</span>
            <span className="text-sm font-medium truncate block">
              {prevSection.title}
            </span>
          </div>
        </Button>
      ) : (
        <div />
      )}

      {nextSection ? (
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-right max-w-[45%] ml-auto"
          onClick={() => scrollToHeading(nextSection.id)}
        >
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground block">Próximo</span>
            <span className="text-sm font-medium truncate block">
              {nextSection.title}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0" />
        </Button>
      ) : (
        <div />
      )}
    </nav>
  );
}
