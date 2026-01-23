'use client';

import { useState } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { regroupTimeSeriesData } from '@/lib/utils/analytics';
import type { UsageAnalytics, TimeSeriesDataPoint, ModelBreakdown, AnalyticsGroupBy } from '@/types/analytics';

import { ASTRO_CHART_COLORS } from '@/config/chartColors';

const ASTRO_COLORS = {
  primary: ASTRO_CHART_COLORS.primary,
  secondary: ASTRO_CHART_COLORS.complementary,
  tertiary: ASTRO_CHART_COLORS.teal,
};

interface UsageAnalyticsCardProps {
  usageAnalytics: UsageAnalytics;
}

/**
 * Formats large token numbers to human-readable format
 */
export function formatTokens(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

/**
 * Gets a color for a bar based on its index
 */
export function getBarColor(index: number): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
  ];
  return colors[index % colors.length];
}

/**
 * Format number for display
 */
function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

/**
 * Format date label for chart based on grouping
 */
function formatDateLabel(dateStr: string, grouping: AnalyticsGroupBy = 'day'): string {
  try {
    const date = parseISO(dateStr);
    if (grouping === 'day') {
      return format(date, 'dd/MM', { locale: ptBR });
    }
    if (grouping === 'week') {
      return format(date, "'Sem' w", { locale: ptBR });
    }
    return format(date, 'MMM/yy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

/**
 * Area chart for daily breakdown using Recharts
 * Follows the same pattern as the analytics page
 */
export function DailyBreakdownChart({ 
  dataPoints,
  grouping = 'day',
  onGroupByChange 
}: { 
  dataPoints: TimeSeriesDataPoint[];
  grouping?: AnalyticsGroupBy;
  onGroupByChange?: (groupBy: AnalyticsGroupBy) => void;
}) {
  const [viewMode, setViewMode] = useState<'total' | 'split'>('total');

  if (dataPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        Sem dados para o periodo
      </div>
    );
  }

  // Regroup data based on grouping period (week/month)
  const regroupedData = regroupTimeSeriesData(dataPoints, grouping);

  // Prepare chart data
  const chartData = regroupedData.map((point) => ({
    date: formatDateLabel(point.date, grouping),
    fullDate: point.date,
    normalizedTokens: typeof point.normalizedTokens === 'number' 
      ? point.normalizedTokens 
      : (Number(point.normalizedTokens) || 0),
    totalTokens: point.totalTokens,
    inputTokens: point.inputTokens,
    outputTokens: point.outputTokens,
    requestCount: point.requestCount,
  }));

  const isBarChart = grouping === 'week' || grouping === 'month';
  const commonChartProps = {
    data: chartData,
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
  };

  const renderChart = () => {
    if (isBarChart) {
      return (
        <BarChart {...commonChartProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tickLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tickFormatter={formatNumber}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
            formatter={(value, name) => {
              const numValue = typeof value === 'number' ? value : 0;
              const nameStr = name as string;
              const labels: Record<string, string> = {
                normalizedTokens: 'Tokens Normalizados',
                totalTokens: 'Total de Tokens',
                inputTokens: 'Tokens de Entrada',
                outputTokens: 'Tokens de Saida',
                requestCount: 'Requisições',
              };
              if (nameStr === 'requestCount') {
                return [numValue.toLocaleString('pt-BR'), labels[nameStr] || nameStr];
              }
              return [formatNumber(numValue), labels[nameStr] || nameStr];
            }}
          />
          {viewMode === 'total' ? (
            <Bar dataKey="normalizedTokens" fill={ASTRO_COLORS.primary} radius={[4, 4, 0, 0]} />
          ) : (
            <>
              <Bar dataKey="inputTokens" stackId="1" fill={ASTRO_COLORS.secondary} radius={[0, 0, 0, 0]} />
              <Bar dataKey="outputTokens" stackId="1" fill={ASTRO_COLORS.tertiary} radius={[4, 4, 0, 0]} />
            </>
          )}
        </BarChart>
      );
    }

    return (
      <AreaChart {...commonChartProps}>
        <defs>
          <linearGradient id="colorNormalized" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ASTRO_COLORS.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ASTRO_COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ASTRO_COLORS.secondary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ASTRO_COLORS.secondary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ASTRO_COLORS.tertiary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ASTRO_COLORS.tertiary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          tickLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          style={{ fontSize: '12px' }}
          tickFormatter={formatNumber}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
          formatter={(value, name) => {
            const numValue = typeof value === 'number' ? value : 0;
            const nameStr = name as string;
            const labels: Record<string, string> = {
              normalizedTokens: 'Tokens Normalizados',
              totalTokens: 'Total de Tokens',
              inputTokens: 'Tokens de Entrada',
              outputTokens: 'Tokens de Saida',
              requestCount: 'Requisições',
            };
            if (nameStr === 'requestCount') {
              return [numValue.toLocaleString('pt-BR'), labels[nameStr] || nameStr];
            }
            return [formatNumber(numValue), labels[nameStr] || nameStr];
          }}
        />
        {viewMode === 'total' ? (
          <Area
            type="monotone"
            dataKey="normalizedTokens"
            stroke={ASTRO_COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorNormalized)"
          />
        ) : (
          <>
            <Area
              type="monotone"
              dataKey="inputTokens"
              stroke={ASTRO_COLORS.secondary}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorInput)"
            />
            <Area
              type="monotone"
              dataKey="outputTokens"
              stroke={ASTRO_COLORS.tertiary}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorOutput)"
            />
          </>
        )}
      </AreaChart>
    );
  };

  return (
    <>
      {/* Controls */}
      <div className="flex items-center justify-end gap-2 mb-4">
        {/* View mode toggle */}
        <div className="flex rounded-md border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('total')}
            className={cn(
              'rounded-r-none px-3',
              viewMode === 'total' && 'bg-muted'
            )}
          >
            Total
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('split')}
            className={cn(
              'rounded-l-none px-3',
              viewMode === 'split' && 'bg-muted'
            )}
          >
            Input/Output
          </Button>
        </div>

        {/* Group by toggle */}
        {onGroupByChange && (
          <div className="flex rounded-md border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onGroupByChange('day')}
              className={cn(
                'rounded-r-none px-3',
                grouping === 'day' && 'bg-muted'
              )}
            >
              Dia
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onGroupByChange('week')}
              className={cn(
                'rounded-none px-3',
                grouping === 'week' && 'bg-muted'
              )}
            >
              Semana
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onGroupByChange('month')}
              className={cn(
                'rounded-l-none px-3',
                grouping === 'month' && 'bg-muted'
              )}
            >
              Mes
            </Button>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        {renderChart()}
      </ResponsiveContainer>
    </>
  );
}

/**
 * Simple horizontal bar chart for model breakdown
 */
export function ModelBreakdownChart({ models }: { models: ModelBreakdown[] }) {
  if (models.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        Sem dados de modelos
      </div>
    );
  }

  const sortedModels = [...models].sort((a, b) => b.normalizedTokens - a.normalizedTokens);
  const topModels = sortedModels.slice(0, 5); // Show top 5 models

  return (
    <div className="space-y-3">
      {topModels.map((model, index) => (
        <div key={model.modelName} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[60%]">{model.modelName}</span>
            <span className="text-muted-foreground">{formatTokens(model.normalizedTokens)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(index)} rounded-full transition-all`}
              style={{ width: `${model.percentageOfTotal}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{model.requestCount} requisicoes</span>
            <span>{model.percentageOfTotal.toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Card component displaying usage analytics
 * Shows daily breakdown chart and model breakdown chart
 */
export function UsageAnalyticsCard({ usageAnalytics }: UsageAnalyticsCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Daily Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Uso Diario
          </CardTitle>
          <CardDescription>
            {format(new Date(usageAnalytics.periodStart), "dd 'de' MMMM", { locale: ptBR })} - {' '}
            {format(new Date(usageAnalytics.periodEnd), "dd 'de' MMMM", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DailyBreakdownChart dataPoints={usageAnalytics.dailyBreakdown} />
        </CardContent>
      </Card>

      {/* Model Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Uso por Modelo
          </CardTitle>
          <CardDescription>
            Distribuicao de tokens por modelo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelBreakdownChart models={usageAnalytics.modelBreakdown} />
        </CardContent>
      </Card>
    </div>
  );
}

