'use client';

import { useMemo, useState, useRef } from 'react';
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
  const analysis = useMemo(() => analyzeDataStructure(data), [data]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    analysis.numericColumns.slice(0, 3) // Select first 3 numeric columns by default
  );
  const chartContainerRef = useRef<HTMLDivElement>(null);

  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Nenhum dado disponível para gráfico
      </div>
    );
  }

  if (analysis.numericColumns.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Nenhuma coluna numérica encontrada para visualização
      </div>
    );
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

  // Color palette for multiple series (VORA brand)
  const colors = [
    '#00f494', // Cyan VORA (primário)
    '#00d9c0', // Cyan claro
    '#6e4df9', // Roxo
    '#ff4242', // Vermelho
    '#ff8c42', // Laranja
    '#ffdd00', // Amarelo
    '#2e6cff', // Azul Royal
    '#133959', // Azul marinho
  ];

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
        <div ref={chartContainerRef} className="rounded-lg border border-border/50 bg-background p-4">
          <ResponsiveContainer width="100%" height={400}>
            <ChartComponent data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="xAxis"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: unknown) => {
                  if (typeof value === 'number') {
                    return value.toLocaleString('pt-BR');
                  }
                  return String(value);
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value: string) => formatKeyName(value)}
              />
              {selectedColumns.map((col, index) => (
                <DataComponent
                  key={col}
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
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-8 text-center border border-border/50 rounded-lg">
          Selecione pelo menos uma coluna para visualizar
        </div>
      )}

      {/* Data summary */}
      <div className="text-xs text-muted-foreground/60 text-right">
        {data.length} {data.length === 1 ? 'ponto de dados' : 'pontos de dados'}
      </div>
    </div>
  );
}

