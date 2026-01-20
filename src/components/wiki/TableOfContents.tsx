'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, List } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { TOCItem } from '@/lib/utils/markdown';

interface TableOfContentsProps {
  items: TOCItem[];
  className?: string;
  onActiveIdChange?: (id: string) => void;
}

/**
 * Table of Contents component with scroll spy functionality
 */
export function TableOfContents({ items, className, onActiveIdChange }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Notify parent of active ID changes
  useEffect(() => {
    if (activeId && onActiveIdChange) {
      onActiveIdChange(activeId);
    }
  }, [activeId, onActiveIdChange]);

  // Scroll spy: detect which heading is currently visible
  useEffect(() => {
    if (items.length === 0) return;

    // Wait for DOM to be ready and markdown to render
    const timeoutId = setTimeout(() => {
      const observerOptions = {
        rootMargin: '-100px 0% -66% 0%', // More accurate detection
        threshold: [0, 0.25, 0.5, 0.75, 1],
      };

      const observerCallback = (entries: IntersectionObserverEntry[]) => {
        // Find the most visible entry
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio (most visible first)
          visibleEntries.sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));
          const mostVisible = visibleEntries[0];
          
          if (mostVisible.target.id) {
            // Find the parent heading (h1) if current is an h2
            const findParentHeading = (id: string): string => {
              for (const item of items) {
                // If this is the h1 itself
                if (item.id === id) return item.id;
                // If this is an h2 child of an h1
                if (item.children?.some(child => child.id === id)) {
                  return item.id; // Highlight the parent h1
                }
              }
              // If not found in TOC, return the id itself (shouldn't happen)
              return id;
            };
            
            const activeIdToSet = findParentHeading(mostVisible.target.id);
            setActiveId(activeIdToSet);
          }
        }
      };

      const observer = new IntersectionObserver(observerCallback, observerOptions);

      // Collect all heading IDs from TOC (h1 and h2 only, including h2 children)
      const allHeadingIds: string[] = [];
      const collectIds = (item: TOCItem) => {
        allHeadingIds.push(item.id);
        // Include h2 children if they exist
        item.children?.forEach(child => allHeadingIds.push(child.id));
      };
      items.forEach(collectIds);

      // Observe all headings
      let observedCount = 0;
      allHeadingIds.forEach((id) => {
        const element = document.getElementById(id);
        if (element) {
          observer.observe(element);
          observedCount++;
        }
      });

      // Debug in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Observing ${observedCount} of ${allHeadingIds.length} headings`);
      }

      return () => {
        observer.disconnect();
      };
    }, 500); // Wait 500ms for markdown to render

    return () => {
      clearTimeout(timeoutId);
    };
  }, [items]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Try to find the element by ID
    let element = document.getElementById(id);
    
    // If not found, try with a hash prefix (some browsers add it)
    if (!element && id.startsWith('#')) {
      element = document.getElementById(id.slice(1));
    } else if (!element && !id.startsWith('#')) {
      element = document.getElementById(`#${id}`);
    }
    
    if (element) {
      const headerOffset = 100; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      // Use scrollIntoView for better browser compatibility
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });

      // Fallback to window.scrollTo if scrollIntoView doesn't work well
      setTimeout(() => {
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }, 100);

      // Update active ID immediately for better UX
      setActiveId(id);
    } else {
      // Debug: log if element not found
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Heading with id "${id}" not found in DOM`);
      }
    }
    
    setIsMobileOpen(false);
  };

  const renderTOCItem = (item: TOCItem) => {
    const isActive = activeId === item.id || item.children?.some(child => child.id === activeId);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="w-full relative">
        {/* Active indicator with animation */}
        {isActive && (
          <motion.div
            layoutId="active-indicator"
            className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        <button
          onClick={(e) => handleClick(e, item.id)}
          className={cn(
            'w-full text-left px-3 py-2 rounded-md transition-all duration-200',
            'hover:bg-muted/50 focus:outline-none focus-visible:outline-none',
            'text-sm font-medium leading-relaxed',
            isActive
              ? 'text-primary font-semibold bg-muted/30 pl-4'
              : 'text-foreground hover:text-primary',
            item.level === 1 && 'text-base font-semibold'
          )}
          aria-current={isActive ? 'location' : undefined}
        >
          <span className="truncate block">{item.title}</span>
        </button>
        {hasChildren && (
          <motion.div
            className="ml-3 mt-1 space-y-1 border-l border-border/30 pl-3"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {item.children?.map((child) => {
              const isChildActive = activeId === child.id;
              return (
                <motion.button
                  key={child.id}
                  onClick={(e) => handleClick(e, child.id)}
                  className={cn(
                    'w-full text-left px-2 py-1.5 rounded-md transition-all duration-200 text-xs',
                    'hover:bg-muted/50 focus:outline-none focus-visible:outline-none',
                    isChildActive
                      ? 'text-primary font-semibold bg-muted/30'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-current={isChildActive ? 'location' : undefined}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                >
                  <span className="truncate block">{child.title}</span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    );
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      {/* Mobile: Collapsible TOC */}
      <div className="lg:hidden mb-6">
        <Collapsible open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 w-full px-4 py-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer text-left"
              aria-expanded={isMobileOpen}
              aria-controls="mobile-toc-content"
            >
              <List className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Índice</span>
              <ChevronRight 
                className={cn(
                  'h-4 w-4 ml-auto transition-transform flex-shrink-0',
                  isMobileOpen && 'rotate-90'
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent 
            id="mobile-toc-content"
            className="mt-2 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
          >
            <div className="bg-muted/30 rounded-lg p-3 space-y-1 max-h-[400px] overflow-y-auto">
              {items.map((item) => renderTOCItem(item))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Desktop: Sticky TOC Sidebar */}
      <aside
        className={cn(
          'hidden lg:block',
          'sticky top-20 self-start',
          'w-[280px]',
          className
        )}
        aria-label="Table of contents"
      >
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3 text-foreground flex items-center gap-2">
            <List className="h-4 w-4" />
            Índice
          </h2>
          <ScrollArea className="max-h-[calc(100vh-180px)]">
            <nav className="space-y-1" role="navigation" aria-label="Document navigation">
              {items.map((item) => renderTOCItem(item))}
            </nav>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}
