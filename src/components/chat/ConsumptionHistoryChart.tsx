'use client';

import { useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ConsumptionHistoryData } from '@/lib/utils/toolSpecificParsers';
import { CHART_PALETTE } from '@/config/chartColors';

interface ConsumptionHistoryChartProps {
  data: ConsumptionHistoryData[];
}

/**
 * Gets month order for sorting
 */
function getMonthOrder(monthName: string): number {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months.indexOf(monthName);
}

/**
 * Prepares data for chart display
 * Groups by year and sorts by month
 */
function prepareChartData(data: ConsumptionHistoryData[]) {
  // Group by year
  const byYear = data.reduce((acc, item) => {
    const year = item.year;
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(item);
    return acc;
  }, {} as Record<number, ConsumptionHistoryData[]>);

  // Sort each year's data by month
  Object.keys(byYear).forEach(year => {
    byYear[Number(year)].sort((a, b) => {
      // First try by month number, then by month name
      if (a.month && b.month) {
        return a.month - b.month;
      }
      return getMonthOrder(a.month_name) - getMonthOrder(b.month_name);
    });
  });

  // Get all unique months (sorted)
  const allMonths = Array.from(
    new Set(data.map(item => item.month_name))
  ).sort((a, b) => getMonthOrder(a) - getMonthOrder(b));

  // Get all years (sorted)
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => a - b);

  // Create chart data structure
  const chartData = allMonths.map(monthName => {
    const chartRow: Record<string, unknown> = {
      month: monthName,
    };

    // Add consumption for each year
    years.forEach(year => {
      const yearData = byYear[year];
      const monthData = yearData.find(item => item.month_name === monthName);
      chartRow[`${year}`] = monthData ? monthData.consumption_kwh : null;
    });

    return chartRow;
  });

  return { chartData, years };
}

export function ConsumptionHistoryChart({ data }: ConsumptionHistoryChartProps) {
  const { chartData, years } = useMemo(() => prepareChartData(data), [data]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Color palette for different years (Astro Steel Blue + Complementary)
  const colors = CHART_PALETTE;

  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Nenhum dado de consumo disponível
      </div>
    );
  }

  return (
    <div className="space-y-4" data-consumption-chart>
      <div ref={chartContainerRef} className="rounded-lg border border-border/50 bg-background p-4">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: '12px' }}
              label={{ 
                value: 'Consumo (kWh)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))' }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: unknown) => {
                if (value === null || value === undefined) return '-';
                if (typeof value === 'number') {
                  return `${value.toLocaleString('pt-BR')} kWh`;
                }
                return String(value);
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value: string) => `Ano ${value}`}
            />
            {years.map((year, index) => (
              <Bar
                key={year}
                dataKey={String(year)}
                fill={colors[index % colors.length]}
                name={String(year)}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-muted-foreground/60 text-right">
        {data.length} {data.length === 1 ? 'registro' : 'registros'} de consumo
      </div>
    </div>
  );
}

