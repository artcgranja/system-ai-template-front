'use client';

import { useRef, useEffect } from 'react';
import { Search, X, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SearchResult } from '@/lib/hooks/useWikiSearch';

interface WikiSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  onClear: () => void;
  onResultClick: (id: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

/**
 * Wiki search component with dropdown results
 */
export function WikiSearch({
  query,
  onQueryChange,
  results,
  isSearching,
  onClear,
  onResultClick,
  inputRef: externalInputRef,
  className,
}: WikiSearchProps) {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef || internalInputRef;
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Don't clear, just lose focus
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (id: string) => {
    onResultClick(id);
    onClear();

    // Scroll to element
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
  };

  const showResults = query.length > 0 && !isSearching;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          placeholder="Buscar na documentação..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-10 pr-10"
          aria-label="Buscar na documentação"
          aria-expanded={showResults && results.length > 0}
          aria-controls="wiki-search-results"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={onClear}
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search results dropdown */}
      {showResults && (
        <div
          id="wiki-search-results"
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-background shadow-lg"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado para &quot;{query}&quot;
            </div>
          ) : (
            <ul className="py-2">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => handleResultClick(result.id)}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors focus:outline-none focus:bg-muted"
                    role="option"
                    aria-selected={false}
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div
                          className={cn(
                            'font-medium text-foreground truncate',
                            result.level === 1 && 'text-base',
                            result.level === 2 && 'text-sm'
                          )}
                        >
                          {result.title}
                        </div>
                        {result.context && (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {result.context}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
