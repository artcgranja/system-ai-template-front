'use client';

import { useWiki } from '@/lib/hooks/useWiki';
import { useMarkdownHeadings } from '@/lib/hooks/useMarkdownHeadings';
import { useWikiSearch } from '@/lib/hooks/useWikiSearch';
import { useWikiKeyboardShortcuts, WIKI_KEYBOARD_SHORTCUTS } from '@/lib/hooks/useWikiKeyboardShortcuts';
import { calculateReadingTime } from '@/lib/utils/markdown';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, ArrowUp, ExternalLink, Link2, Clock, Check, Keyboard, X } from 'lucide-react';
import { CodeBlock } from '@/components/chat/CodeBlock';
import {
  TableOfContents,
  ReadingProgress,
  WikiSearch,
  SectionNavigation,
  WikiBreadcrumbs,
} from '@/components/wiki';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

/**
 * Heading with copy link button
 */
interface HeadingWithLinkProps {
  id?: string;
  children: React.ReactNode;
  className: string;
  Tag: 'h1' | 'h2' | 'h3' | 'h4';
  onCopyLink: (id: string) => void;
  copiedId: string | null;
}

function HeadingWithLink({ id, children, className, Tag, onCopyLink, copiedId }: HeadingWithLinkProps) {
  const isCopied = copiedId === id;

  return (
    <Tag id={id} className={`group ${className}`}>
      <span className="flex items-center gap-2">
        {children}
        {id && (
          <button
            onClick={() => onCopyLink(id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center h-6 w-6 rounded hover:bg-muted"
            aria-label="Copiar link da seção"
            title="Copiar link da seção"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Link2 className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )}
      </span>
    </Tag>
  );
}

/**
 * Enhanced markdown components for wiki documentation
 * Includes IDs for headings and improved styling
 */
const createMarkdownComponents = (
  onCopyLink: (id: string) => void,
  copiedId: string | null
): Components => ({
  // Paragraphs - improved typography
  p: ({ children }) => (
    <p className="mb-6 last:mb-0 text-base leading-7 text-foreground">
      {children}
    </p>
  ),
  // Lists - better spacing
  ul: ({ children }) => (
    <ul className="mb-6 ml-6 list-disc space-y-2 marker:text-muted-foreground/60">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-6 ml-6 list-decimal space-y-2 marker:text-muted-foreground/60">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="leading-7 text-base text-foreground pl-2">
      {children}
    </li>
  ),
  // Headings - with copy link button
  h1: ({ children, id }) => (
    <HeadingWithLink
      id={id}
      Tag="h1"
      className="mb-8 text-4xl font-bold tracking-tight text-foreground scroll-mt-20"
      onCopyLink={onCopyLink}
      copiedId={copiedId}
    >
      {children}
    </HeadingWithLink>
  ),
  h2: ({ children, id }) => (
    <HeadingWithLink
      id={id}
      Tag="h2"
      className="mb-4 mt-12 text-2xl font-semibold tracking-tight text-foreground scroll-mt-20"
      onCopyLink={onCopyLink}
      copiedId={copiedId}
    >
      {children}
    </HeadingWithLink>
  ),
  h3: ({ children, id }) => (
    <HeadingWithLink
      id={id}
      Tag="h3"
      className="mb-3 mt-8 text-xl font-semibold tracking-tight text-foreground scroll-mt-20"
      onCopyLink={onCopyLink}
      copiedId={copiedId}
    >
      {children}
    </HeadingWithLink>
  ),
  h4: ({ children, id }) => (
    <HeadingWithLink
      id={id}
      Tag="h4"
      className="mb-2 mt-6 text-lg font-medium tracking-tight text-muted-foreground scroll-mt-20"
      onCopyLink={onCopyLink}
      copiedId={copiedId}
    >
      {children}
    </HeadingWithLink>
  ),
  // Code blocks - enhanced styling
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || '');
    const inline = !match;
    const code = String(children).replace(/\n$/, '');

    if (inline) {
      return <CodeBlock code={code} inline className={className} />;
    }

    return (
      <CodeBlock language={match ? match[1] : 'text'} code={code} />
    );
  },
  pre: ({ children }) => <>{children}</>,
  // Links - with external link icon
  a: ({ href, children }) => {
    const isExternal = href?.startsWith('http');
    return (
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className="text-primary hover:underline font-medium inline-flex items-center gap-1"
      >
        {children}
        {isExternal && <ExternalLink className="h-3 w-3" />}
      </a>
    );
  },
  // Blockquotes - enhanced styling
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/40 pl-6 py-2 my-6 bg-muted/30 rounded-r-md italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  // Horizontal rule
  hr: () => <hr className="my-8 border-border" />,
  // Tables - improved styling with hover effects
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border bg-background">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-muted/30 transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-sm text-foreground">
      {children}
    </td>
  ),
  // Strong/Bold
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  // Emphasis/Italic
  em: ({ children }) => (
    <em className="italic text-foreground">{children}</em>
  ),
  // Images - using regular img tag for markdown content (external URLs)
  // Note: Using img instead of Next.js Image because markdown may contain external URLs
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="my-6 rounded-lg border border-border max-w-full h-auto"
      loading="lazy"
    />
  ),
});

/**
 * Back to top button component
 */
function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!isVisible) return null;

  return (
    <Button
      onClick={scrollToTop}
      size="icon"
      className="fixed bottom-8 right-8 z-50 rounded-full shadow-lg"
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
}

/**
 * Wiki page component
 * Displays documentation fetched from the wiki API endpoint
 * with enhanced UI/UX including table of contents and improved typography
 */
export default function WikiPage() {
  const { data: content, isLoading, error } = useWiki();
  const headings = useMarkdownHeadings(content);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Wiki search
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isSearching,
    clearSearch,
  } = useWikiSearch({
    markdown: content,
    headings,
  });

  // Keyboard shortcuts
  useWikiKeyboardShortcuts({
    headings,
    activeId,
    onFocusSearch: () => searchInputRef.current?.focus(),
    onShowHelp: () => setShowKeyboardHelp((prev) => !prev),
    enabled: !isLoading && !error,
  });

  // Calculate reading time
  const readingTime = useMemo(() => {
    return content ? calculateReadingTime(content) : 0;
  }, [content]);

  // Handle copy link
  const handleCopyLink = useCallback((id: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  // Handle search result click
  const handleSearchResultClick = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  // Handle active ID change from TOC
  const handleActiveIdChange = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  // Memoize markdown components to avoid re-creating on every render
  const markdownComponents = useMemo(
    () => createMarkdownComponents(handleCopyLink, copiedId),
    [handleCopyLink, copiedId]
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto max-w-7xl py-8 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            <div className="hidden lg:block">
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-4/6" />
              <div className="space-y-4 mt-8">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="space-y-4 mt-8">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    const errorMessage =
      (error as { response?: { status?: number } })?.response?.status === 404
        ? 'Documentação não encontrada'
        : (error as { response?: { status?: number } })?.response?.status === 500
        ? 'Erro ao carregar documentação'
        : 'Erro de conexão';

    return (
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto max-w-7xl py-8 px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-xl font-semibold mb-2">Erro ao carregar Wiki</h2>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state - render markdown content with TOC
  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      {/* Reading progress bar */}
      <ReadingProgress containerRef={containerRef} className="reading-progress" />

      <div className="container mx-auto max-w-7xl py-8 px-4 pb-12 wiki-layout">
        {/* Header with search and metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Reading time indicator */}
            {readingTime > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{readingTime} min de leitura</span>
              </div>
            )}
            {/* Keyboard shortcuts button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeyboardHelp((prev) => !prev)}
              className="hidden sm:flex items-center gap-2 text-muted-foreground"
              aria-label="Mostrar atalhos de teclado"
            >
              <Keyboard className="h-4 w-4" />
              <span className="text-xs">Atalhos</span>
            </Button>
          </div>

          {/* Search bar */}
          <WikiSearch
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
            isSearching={isSearching}
            onClear={clearSearch}
            onResultClick={handleSearchResultClick}
            inputRef={searchInputRef}
            className="w-full sm:w-64 lg:w-80 wiki-search"
          />
        </div>

        {/* Breadcrumbs */}
        {activeId && (
          <WikiBreadcrumbs
            headings={headings}
            activeId={activeId}
            className="mb-4 wiki-breadcrumbs"
          />
        )}

        {/* Keyboard shortcuts help panel */}
        {showKeyboardHelp && (
          <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Atalhos de Teclado
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowKeyboardHelp(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WIKI_KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center gap-2 text-sm">
                  <kbd className="px-2 py-1 bg-background rounded border border-border text-xs font-mono">
                    {shortcut.key}
                  </kbd>
                  <span className="text-muted-foreground">{shortcut.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Table of Contents Sidebar - Left side */}
          <TableOfContents
            items={headings}
            onActiveIdChange={handleActiveIdChange}
            className="wiki-toc"
          />

          {/* Main content */}
          <article className="min-w-0">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
                components={markdownComponents}
              >
                {content || ''}
              </ReactMarkdown>
            </div>

            {/* Section navigation */}
            <SectionNavigation
              headings={headings}
              activeId={activeId}
              className="section-navigation"
            />
          </article>
        </div>
      </div>

      {/* Back to top button */}
      <BackToTop />
    </div>
  );
}
