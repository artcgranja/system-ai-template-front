'use client';

import { cn } from '@/lib/utils';

interface ChartEmptyStateProps {
  message?: string;
  height?: number | string;
  className?: string;
}

/**
 * Estado vazio padronizado para gráficos
 * Exibe mensagem centralizada quando não há dados
 */
export function ChartEmptyState({
  message = 'Nenhum dado disponível',
  height = 350,
  className,
}: ChartEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center text-muted-foreground',
        className
      )}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {message}
    </div>
  );
}

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Container padronizado para gráficos com borda e background
 */
export function ChartContainer({ children, className }: ChartContainerProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border/50 bg-background p-4',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ChartDataSummaryProps {
  count: number;
  singular?: string;
  plural?: string;
  className?: string;
}

/**
 * Sumário de dados exibido abaixo do gráfico
 * Mostra quantidade de pontos de dados
 */
export function ChartDataSummary({
  count,
  singular = 'registro',
  plural = 'registros',
  className,
}: ChartDataSummaryProps) {
  return (
    <div className={cn('text-xs text-muted-foreground/60 text-right', className)}>
      {count} {count === 1 ? singular : plural}
    </div>
  );
}
