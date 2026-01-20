'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { PresentationViewer } from './PresentationViewer';
import { presentationsApi } from '@/lib/api/presentations';
import { normalizePresentationFiles } from '@/lib/utils/planningTools';
import type { PlanningToolResult, PresentationFiles } from '@/types/planning';

interface PresentationResultCardProps {
  result: PlanningToolResult;
}

/**
 * Component for displaying presentation generation results
 * Shows when a plan has gamma_result with presentation files
 */
export function PresentationResultCard({ result }: PresentationResultCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Normalize files to legacy format for backward compatibility
  // Handles both new format (url, filename, size) and legacy (storage_path, signed_url, size_bytes)
  const initialFiles = useMemo(
    () =>
      normalizePresentationFiles(
        result.gamma_result?.files as Parameters<typeof normalizePresentationFiles>[0]
      ) || {},
    [result.gamma_result?.files]
  );

  const [files, setFiles] = useState<PresentationFiles>(initialFiles);
  const [presentationUrl, setPresentationUrl] = useState(
    result.gamma_result?.presentation_url || null
  );

  const handleRefreshUrls = useCallback(async () => {
    if (!result.plan_id) return;

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const response = await presentationsApi.getFiles(result.plan_id);
      setFiles(response.files);
      setPresentationUrl(response.presentation_url);
    } catch (err) {
      setRefreshError(
        err instanceof Error ? err.message : 'Falha ao atualizar links'
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [result.plan_id]);

  // If no gamma_result yet, show the success message with a loading indicator
  if (!result.gamma_result) {
    if (result.success && result.message) {
      return (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium">{result.message}</span>
          </div>
        </div>
      );
    }
    return null;
  }

  const { gamma_result } = result;

  // Error state from Gamma
  if (gamma_result.status === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 p-4">
        <p className="text-red-800 dark:text-red-300 font-medium">
          Erro ao gerar apresentação
        </p>
        {gamma_result.error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
            {gamma_result.error}
          </p>
        )}
      </div>
    );
  }

  // Skipped state
  if (gamma_result.status === 'skipped') {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/50 p-4">
        <p className="text-yellow-800 dark:text-yellow-300 font-medium">
          Geração de apresentação ignorada
        </p>
        {gamma_result.message && (
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
            {gamma_result.message}
          </p>
        )}
      </div>
    );
  }

  // Success state - show presentation viewer only
  return (
    <PresentationViewer
      files={files}
      presentationUrl={presentationUrl}
      onRefreshUrls={handleRefreshUrls}
      isLoading={isRefreshing}
      error={refreshError}
    />
  );
}
