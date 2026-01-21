'use client';

import { useState } from 'react';
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
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { TimeSeriesDataPoint, AnalyticsGroupBy } from '@/types/analytics';

interface TokenUsageChartProps {
  dataPoints: TimeSeriesDataPoint[];
  grouping: AnalyticsGroupBy;
  isLoading?: boolean;
  onGroupByChange?: (groupBy: AnalyticsGroupBy) => void;
}

const ASTRO_COLORS = {
  primary: '#4F739E', // astro-500 - Astro Steel Blue
  secondary: '#6b8bb5', // astro-400 - Astro Steel Blue claro
  tertiary: '#8daec9', // astro-300 - Astro Steel Blue mais claro
};

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

function formatDateLabel(dateStr: string, grouping: AnalyticsGroupBy): string {
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

export function TokenUsageChart({
  dataPoints,
  grouping,
  isLoading,
  onGroupByChange,
}: TokenUsageChartProps) {
  const [viewMode, setViewMode] = useState<'total' | 'split'>('total');

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
    date: formatDateLabel(point.date, grouping),
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
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                normalizedTokens: 'Tokens Normalizados',
                totalTokens: 'Total de Tokens',
                inputTokens: 'Tokens de Entrada',
                outputTokens: 'Tokens de Saida',
              };
              return [value.toLocaleString('pt-BR'), labels[name] || name];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value: string) => {
              const labels: Record<string, string> = {
                normalizedTokens: 'Tokens Normalizados',
                totalTokens: 'Total de Tokens',
                inputTokens: 'Tokens de Entrada',
                outputTokens: 'Tokens de Saida',
              };
              return labels[value] || value;
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
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
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
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              normalizedTokens: 'Tokens Normalizados',
              totalTokens: 'Total de Tokens',
              inputTokens: 'Tokens de Entrada',
              outputTokens: 'Tokens de Saida',
            };
            return [value.toLocaleString('pt-BR'), labels[name] || name];
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value: string) => {
            const labels: Record<string, string> = {
              normalizedTokens: 'Tokens Normalizados',
              totalTokens: 'Total de Tokens',
              inputTokens: 'Tokens de Entrada',
              outputTokens: 'Tokens de Saida',
            };
            return labels[value] || value;
          }}
        />
        {viewMode === 'total' ? (
          <Area
            type="monotone"
            dataKey="normalizedTokens"
            stroke={ASTRO_COLORS.primary}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
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
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            Nenhum dado disponivel para o periodo selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
