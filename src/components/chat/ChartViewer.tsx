'use client';

import { useMemo, useState, useId } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKeyName, formatValue } from '@/lib/utils/toolResultParser';
import { CHART_PALETTE } from '@/config/chartColors';
import {
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_GRID_STYLE,
  CHART_AXIS_STYLE,
  CHART_LEGEND_STYLE,
  CHART_HEIGHTS,
  formatTooltipValue,
} from '@/lib/utils/chartUtils';
import { ChartEmptyState, ChartContainer, ChartDataSummary } from '@/components/ui/chart-primitives';

interface ChartViewerProps {
  data: Record<string, unknown>[];
}

/**
 * Detects if a value is a date string
 */
function isDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (dateMatch) {
    try {
      const date = new Date(value);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Detects if a value is a number
 */
function isNumeric(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Formats date for chart display
 */
function formatDateForChart(value: string): string {
  try {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      // Format as MM/YYYY for better readability
      return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    }
  } catch {
    // Fallback
  }
  return value;
}

/**
 * Analyzes data structure to determine chart configuration
 */
function analyzeDataStructure(data: Record<string, unknown>[]) {
  if (data.length === 0) {
    return { dateColumn: null, numericColumns: [], categoryColumn: null };
  }

  const allKeys = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
  
  // Find date column (usually contains 'date', 'period', 'month', 'year', etc.)
  const dateColumn = allKeys.find(key => {
    const sampleValue = data.find(obj => obj[key] !== undefined)?.[key];
    return (
      isDateString(sampleValue) ||
      (typeof sampleValue === 'string' && 
       (key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('period') ||
        key.toLowerCase().includes('month') ||
        key.toLowerCase().includes('year')))
    );
  });

  // Find numeric columns (exclude date columns and IDs)
  const numericColumns = allKeys.filter(key => {
    if (key === dateColumn) return false;
    if (key.toLowerCase().includes('id')) return false;
    
    const sampleValue = data.find(obj => obj[key] !== undefined)?.[key];
    return isNumeric(sampleValue);
  });

  // Find category column (for X-axis when no date column)
  const categoryColumn = !dateColumn
    ? allKeys.find(
        key =>
          key !== dateColumn &&
          !numericColumns.includes(key) &&
          typeof data.find(obj => obj[key] !== undefined)?.[key] === 'string'
      )
    : null;

  return { dateColumn, numericColumns, categoryColumn };
}

export function ChartViewer({ data }: ChartViewerProps) {
  const chartId = useId();
  const analysis = useMemo(() => analyzeDataStructure(data), [data]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    analysis.numericColumns.slice(0, 3) // Select first 3 numeric columns by default
  );

  if (data.length === 0) {
    return <ChartEmptyState message="Nenhum dado disponível para gráfico" />;
  }

  if (analysis.numericColumns.length === 0) {
    return <ChartEmptyState message="Nenhuma coluna numérica encontrada para visualização" />;
  }

  // Prepare chart data
  const chartData = data.map(row => {
    const chartRow: Record<string, unknown> = {};
    
    // Add X-axis value (date or category)
    if (analysis.dateColumn) {
      const dateValue = row[analysis.dateColumn];
      chartRow.xAxis = typeof dateValue === 'string' 
        ? formatDateForChart(dateValue)
        : dateValue;
    } else if (analysis.categoryColumn) {
      chartRow.xAxis = formatValue(row[analysis.categoryColumn]);
    } else {
      // Fallback: use index
      chartRow.xAxis = `Item ${data.indexOf(row) + 1}`;
    }

    // Add numeric columns
    analysis.numericColumns.forEach(col => {
      chartRow[col] = row[col];
    });

    return chartRow;
  });

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column)
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const hasDateColumn = !!analysis.dateColumn;
  const ChartComponent = hasDateColumn ? LineChart : BarChart;
  const DataComponent = hasDateColumn ? Line : Bar;

  // Color palette for multiple series (Astro Steel Blue + Complementary)
  const colors = CHART_PALETTE;

  return (
    <div className="space-y-4" data-chart-viewer>
      {/* Column selector */}
      {analysis.numericColumns.length > 1 && (
        <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Selecionar Colunas
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.numericColumns.map((col) => {
              const isSelected = selectedColumns.includes(col);
              return (
                <button
                  key={col}
                  onClick={() => toggleColumn(col)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
                  )}
                >
                  {isSelected ? (
                    <CheckSquare className="h-3 w-3" />
                  ) : (
                    <Square className="h-3 w-3" />
                  )}
                  {formatKeyName(col)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart */}
      {selectedColumns.length > 0 ? (
        <ChartContainer>
          <ResponsiveContainer width="100%" height={CHART_HEIGHTS.detailed}>
            <ChartComponent accessibilityLayer data={chartData}>
              <CartesianGrid {...CHART_GRID_STYLE} />
              <XAxis
                dataKey="xAxis"
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
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                formatter={(value: unknown) => formatTooltipValue(value)}
              />
              <Legend
                wrapperStyle={CHART_LEGEND_STYLE}
                formatter={(value: string) => formatKeyName(value)}
              />
              {selectedColumns.map((col, index) => (
                <DataComponent
                  key={`${chartId}-${col}`}
                  type={hasDateColumn ? 'monotone' : undefined}
                  dataKey={col}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={col}
                />
              ))}
            </ChartComponent>
          </ResponsiveContainer>
        </ChartContainer>
      ) : (
        <ChartEmptyState message="Selecione pelo menos uma coluna para visualizar" />
      )}

      {/* Data summary */}
      <ChartDataSummary count={data.length} singular="ponto de dados" plural="pontos de dados" />
    </div>
  );
}

