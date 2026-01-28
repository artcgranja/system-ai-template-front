'use client';

import { useMemo } from 'react';
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
import {
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_GRID_STYLE,
  CHART_AXIS_STYLE,
  CHART_LEGEND_STYLE,
  CHART_HEIGHTS,
  CHART_MARGINS,
  formatTooltipValue,
} from '@/lib/utils/chartUtils';
import { ChartEmptyState, ChartContainer, ChartDataSummary } from '@/components/ui/chart-primitives';

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

  // Color palette for different years (Astro Steel Blue + Complementary)
  const colors = CHART_PALETTE;

  if (data.length === 0) {
    return <ChartEmptyState message="Nenhum dado de consumo disponível" />;
  }

  return (
    <div className="space-y-4" data-consumption-chart>
      <ChartContainer>
        <ResponsiveContainer width="100%" height={CHART_HEIGHTS.detailed}>
          <BarChart accessibilityLayer data={chartData} margin={CHART_MARGINS.withAngledLabels}>
            <CartesianGrid {...CHART_GRID_STYLE} />
            <XAxis
              dataKey="month"
              stroke={CHART_AXIS_STYLE.stroke}
              style={{ fontSize: CHART_AXIS_STYLE.fontSize }}
              angle={-45}
              textAnchor="end"
              height={80}
              tickLine={false}
            />
            <YAxis
              stroke={CHART_AXIS_STYLE.stroke}
              style={{ fontSize: CHART_AXIS_STYLE.fontSize }}
              label={{
                value: 'Consumo (kWh)',
                angle: -90,
                position: 'insideLeft',
                style: { textAnchor: 'middle', fill: 'hsl(var(--foreground))' }
              }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_TOOLTIP_LABEL_STYLE}
              formatter={(value: unknown) => formatTooltipValue(value, 'consumption_kwh')}
            />
            <Legend
              wrapperStyle={CHART_LEGEND_STYLE}
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
      </ChartContainer>
      <ChartDataSummary count={data.length} singular="registro de consumo" plural="registros de consumo" />
    </div>
  );
}

