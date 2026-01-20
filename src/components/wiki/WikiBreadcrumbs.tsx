'use client';

import { useMemo } from 'react';
import { ChevronRight, Home, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TOCItem } from '@/lib/utils/markdown';

interface WikiBreadcrumbsProps {
  headings: TOCItem[];
  activeId: string;
  wikiTitle?: string;
  className?: string;
}

/**
 * Find the active heading and its parent
 */
function findActiveHeading(
  items: TOCItem[],
  activeId: string
): { parent: TOCItem | null; current: TOCItem | null } {
  for (const item of items) {
    if (item.id === activeId) {
      return { parent: null, current: item };
    }

    if (item.children) {
      for (const child of item.children) {
        if (child.id === activeId) {
          return { parent: item, current: child };
        }
      }
    }
  }

  return { parent: null, current: null };
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
 * Breadcrumbs component for wiki navigation
 * Shows: Wiki > Parent Section > Current Section
 */
export function WikiBreadcrumbs({
  headings,
  activeId,
  wikiTitle = 'Documentação',
  className,
}: WikiBreadcrumbsProps) {
  const { parent, current } = useMemo(
    () => findActiveHeading(headings, activeId),
    [headings, activeId]
  );

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      className={cn('flex items-center gap-1 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center gap-1 flex-wrap">
        {/* Wiki home */}
        <li>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span>{wikiTitle}</span>
          </button>
        </li>

        {/* Parent section (if exists) */}
        {parent && (
          <>
            <li className="text-muted-foreground">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <button
                onClick={() => scrollToHeading(parent.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {parent.title}
              </button>
            </li>
          </>
        )}

        {/* Current section */}
        {current && (
          <>
            <li className="text-muted-foreground">
              <ChevronRight className="h-3.5 w-3.5" />
            </li>
            <li>
              <span
                className="flex items-center gap-1.5 text-foreground font-medium"
                aria-current="page"
              >
                <FileText className="h-3.5 w-3.5" />
                {current.title}
              </span>
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
