'use client';

import { useState, useId } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TimeSeriesDataPoint, AnalyticsGroupBy } from '@/types/analytics';
import { ASTRO_CHART_COLORS } from '@/config/chartColors';
import {
  formatChartNumber,
  formatChartDate,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_GRID_STYLE,
  CHART_AXIS_STYLE,
  CHART_LEGEND_STYLE,
  CHART_HEIGHTS,
  CHART_MARGINS,
  getChartLabel,
} from '@/lib/utils/chartUtils';
import { ChartEmptyState } from '@/components/ui/chart-primitives';

interface TokenUsageChartProps {
  dataPoints: TimeSeriesDataPoint[];
  grouping: AnalyticsGroupBy;
  isLoading?: boolean;
  onGroupByChange?: (groupBy: AnalyticsGroupBy) => void;
}

const ASTRO_COLORS = {
  primary: ASTRO_CHART_COLORS.primary,
  secondary: ASTRO_CHART_COLORS.complementary,
  tertiary: ASTRO_CHART_COLORS.teal,
};

export function TokenUsageChart({
  dataPoints,
  grouping,
  isLoading,
  onGroupByChange,
}: TokenUsageChartProps) {
  const chartId = useId();
  const [viewMode, setViewMode] = useState<'total' | 'split'>('total');

  // Generate unique gradient IDs to avoid conflicts
  const gradientIds = {
    total: `${chartId}-colorTotal`,
    input: `${chartId}-colorInput`,
    output: `${chartId}-colorOutput`,
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = dataPoints.map((point) => ({
    date: formatChartDate(point.date, grouping),
    fullDate: point.date,
    totalTokens: point.totalTokens,
    inputTokens: point.inputTokens,
    outputTokens: point.outputTokens,
    normalizedTokens: point.normalizedTokens,
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
              return [numValue.toLocaleString('pt-BR'), getChartLabel(name as string)];
            }}
          />
          <Legend
            wrapperStyle={CHART_LEGEND_STYLE}
            formatter={(value: string) => getChartLabel(value)}
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
          <linearGradient id={gradientIds.total} x1="0" y1="0" x2="0" y2="1">
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
            return [numValue.toLocaleString('pt-BR'), getChartLabel(name as string)];
          }}
        />
        <Legend
          wrapperStyle={CHART_LEGEND_STYLE}
          formatter={(value: string) => getChartLabel(value)}
        />
        {viewMode === 'total' ? (
          <Area
            type="monotone"
            dataKey="normalizedTokens"
            stroke={ASTRO_COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#${gradientIds.total})`}
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Uso de Tokens ao Longo do Tempo</CardTitle>
        <div className="flex items-center gap-2">
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
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <ChartEmptyState message="Nenhum dado disponível para o período selecionado" />
        ) : (
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.default}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
