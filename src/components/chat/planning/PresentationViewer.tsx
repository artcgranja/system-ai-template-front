'use client';

import React, { useState, useCallback } from 'react';
import { Download, Presentation, ExternalLink, RefreshCw, AlertCircle, Loader2, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { PresentationFiles } from '@/types/planning';

interface PresentationViewerProps {
  /** Presentation files with signed URLs (PPTX only) */
  files: PresentationFiles;
  /** Gamma hosted presentation URL for external viewing */
  presentationUrl?: string | null;
  /** Callback to refresh expired URLs */
  onRefreshUrls?: () => Promise<void>;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Build Microsoft Office Online Viewer URL
 * This embeds the PPTX viewer in an iframe
 */
function buildOfficeViewerUrl(pptxUrl: string): string {
  const encodedUrl = encodeURIComponent(pptxUrl);
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
}

/**
 * PresentationViewer component
 * Displays PowerPoint presentations using Microsoft Office Online Viewer
 */
export function PresentationViewer({
  files,
  presentationUrl,
  onRefreshUrls,
  isLoading = false,
  error = null,
  className,
}: PresentationViewerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefreshUrls) return;

    setIsRefreshing(true);
    setIframeError(false);
    setIframeLoading(true);
    try {
      await onRefreshUrls();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefreshUrls]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeLoading(false);
    setIframeError(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border border-border bg-muted/30 p-6', className)}>
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando apresentação...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn('rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-6', className)}>
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
          {onRefreshUrls && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Tentar novamente</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  // No presentation available
  if (!files.pptx) {
    return (
      <div className={cn('rounded-lg border border-border bg-muted/30 p-6', className)}>
        <div className="flex flex-col items-center justify-center gap-4">
          <Presentation className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Apresentação não disponível</p>
        </div>
      </div>
    );
  }

  const pptxUrl = files.pptx.signed_url;
  const pptxSize = files.pptx.size_bytes;
  const viewerUrl = buildOfficeViewerUrl(pptxUrl);

  return (
    <div className={cn('rounded-lg border border-border bg-muted/30 overflow-hidden', className)}>
      {/* Header with title and actions */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border/50 bg-background/50">
        <div className="flex items-center gap-2">
          <Presentation className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">Apresentação Gerada</span>
          {pptxSize && (
            <span className="text-xs text-muted-foreground">
              ({formatFileSize(pptxSize)})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefreshUrls && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Atualizar links"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          )}

          {presentationUrl && (
            <a
              href={presentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              title="Abrir no Gamma"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Gamma
            </a>
          )}
        </div>
      </div>

      {/* PowerPoint Viewer (Microsoft Office Online) */}
      {!iframeError ? (
        <div className="relative">
          {/* Loading overlay */}
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Carregando visualização...</span>
              </div>
            </div>
          )}

          {/* Iframe container */}
          <div className="h-[450px] bg-white dark:bg-muted/20">
            <iframe
              src={viewerUrl}
              className="w-full h-full border-0"
              title="Visualização do PowerPoint"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>

          {/* Fullscreen dialog trigger */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-3 right-3 shadow-md gap-1.5"
              >
                <Maximize2 className="h-4 w-4" />
                Expandir
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle>Visualização da Apresentação</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 bg-white">
                <iframe
                  src={viewerUrl}
                  className="w-full h-full border-0"
                  title="Visualização do PowerPoint (Tela Cheia)"
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        /* Iframe Error fallback */
        <div className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            Não foi possível carregar a visualização
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Download section */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border/50 bg-background/50">
        <span className="text-xs text-muted-foreground">
          Visualização via Microsoft Office Online
        </span>
        <a
          href={pptxUrl}
          download="apresentacao.pptx"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Baixar PowerPoint</span>
        </a>
      </div>
    </div>
  );
}
