'use client';

import { useState, useId } from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { format } from 'date-fns';
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
import {
  formatChartNumber,
  formatChartDate,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_GRID_STYLE,
  CHART_AXIS_STYLE,
  CHART_HEIGHTS,
  CHART_MARGINS,
  getChartLabel,
} from '@/lib/utils/chartUtils';
import { ChartEmptyState } from '@/components/ui/chart-primitives';

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
 * @deprecated Use formatChartNumber from chartUtils.ts instead
 */
export function formatTokens(value: number): string {
  return formatChartNumber(value);
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
  const chartId = useId();
  const [viewMode, setViewMode] = useState<'total' | 'split'>('total');

  // Generate unique gradient IDs to avoid conflicts
  const gradientIds = {
    normalized: `${chartId}-colorNormalized`,
    input: `${chartId}-colorInput`,
    output: `${chartId}-colorOutput`,
  };

  if (dataPoints.length === 0) {
    return <ChartEmptyState message="Sem dados para o período" />;
  }

  // Regroup data based on grouping period (week/month)
  const regroupedData = regroupTimeSeriesData(dataPoints, grouping);

  // Prepare chart data
  const chartData = regroupedData.map((point) => ({
    date: formatChartDate(point.date, grouping),
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
    margin: CHART_MARGINS.default,
  };

  const renderChart = () => {
    if (isBarChart) {
      return (
        <BarChart accessibilityLayer {...commonChartProps}>
          <CartesianGrid {...CHART_GRID_STYLE} />
          <XAxis
            dataKey="date"
            stroke={CHART_AXIS_STYLE.stroke}
            style={{ fontSize: CHART_AXIS_STYLE.fontSize }}
            tickLine={false}
          />
          <YAxis
            stroke={CHART_AXIS_STYLE.stroke}
            style={{ fontSize: CHART_AXIS_STYLE.fontSize }}
            tickFormatter={formatChartNumber}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            formatter={(value, name) => {
              const numValue = typeof value === 'number' ? value : 0;
              const nameStr = name as string;
              if (nameStr === 'requestCount') {
                return [numValue.toLocaleString('pt-BR'), getChartLabel(nameStr)];
              }
              return [formatChartNumber(numValue), getChartLabel(nameStr)];
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
      <AreaChart accessibilityLayer {...commonChartProps}>
        <defs>
          <linearGradient id={gradientIds.normalized} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ASTRO_COLORS.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ASTRO_COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={gradientIds.input} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ASTRO_COLORS.secondary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ASTRO_COLORS.secondary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={gradientIds.output} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ASTRO_COLORS.tertiary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={ASTRO_COLORS.tertiary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...CHART_GRID_STYLE} />
        <XAxis
          dataKey="date"
          stroke={CHART_AXIS_STYLE.stroke}
          style={{ fontSize: CHART_AXIS_STYLE.fontSize }}
          tickLine={false}
        />
        <YAxis
          stroke={CHART_AXIS_STYLE.stroke}
          style={{ fontSize: CHART_AXIS_STYLE.fontSize }}
          tickFormatter={formatChartNumber}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
          formatter={(value, name) => {
            const numValue = typeof value === 'number' ? value : 0;
            const nameStr = name as string;
            if (nameStr === 'requestCount') {
              return [numValue.toLocaleString('pt-BR'), getChartLabel(nameStr)];
            }
            return [formatChartNumber(numValue), getChartLabel(nameStr)];
          }}
        />
        {viewMode === 'total' ? (
          <Area
            type="monotone"
            dataKey="normalizedTokens"
            stroke={ASTRO_COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientIds.normalized})`}
          />
        ) : (
          <>
            <Area
              type="monotone"
              dataKey="inputTokens"
              stroke={ASTRO_COLORS.secondary}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientIds.input})`}
            />
            <Area
              type="monotone"
              dataKey="outputTokens"
              stroke={ASTRO_COLORS.tertiary}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientIds.output})`}
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
      <ResponsiveContainer width="100%" height={CHART_HEIGHTS.default}>
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
    return <ChartEmptyState message="Sem dados de modelos" height={192} />;
  }

  const sortedModels = [...models].sort((a, b) => b.normalizedTokens - a.normalizedTokens);
  const topModels = sortedModels.slice(0, 5); // Show top 5 models

  return (
    <div className="space-y-3">
      {topModels.map((model, index) => (
        <div key={model.modelName} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[60%]">{model.modelName}</span>
            <span className="text-muted-foreground">{formatChartNumber(model.normalizedTokens)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${getBarColor(index)} rounded-full transition-all`}
              style={{ width: `${model.percentageOfTotal}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{model.requestCount} requisições</span>
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
            Uso Diário
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
            Distribuição de tokens por modelo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelBreakdownChart models={usageAnalytics.modelBreakdown} />
        </CardContent>
      </Card>
    </div>
  );
}

