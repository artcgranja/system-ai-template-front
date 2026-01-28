'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DepartmentBreakdown as DepartmentBreakdownType } from '@/types/analytics';
import { CHART_PALETTE } from '@/config/chartColors';
import {
  formatChartNumber,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_GRID_STYLE,
  CHART_AXIS_STYLE,
} from '@/lib/utils/chartUtils';
import { ChartEmptyState } from '@/components/ui/chart-primitives';

interface DepartmentBreakdownProps {
  departments: DepartmentBreakdownType[];
  isLoading?: boolean;
}

const ASTRO_COLORS = CHART_PALETTE;

export function DepartmentBreakdown({ departments, isLoading }: DepartmentBreakdownProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = departments
    .sort((a, b) => b.normalizedTokens - a.normalizedTokens)
    .slice(0, 8)
    .map((dept) => ({
      name: dept.departmentName.length > 15
        ? `${dept.departmentName.substring(0, 15)}...`
        : dept.departmentName,
      fullName: dept.departmentName,
      tokens: dept.normalizedTokens,
      users: dept.activeUsers,
      percentage: dept.percentageOfTotal,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Uso por Departamento</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <ChartEmptyState message="Nenhum dado disponível" height={300} />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid {...CHART_GRID_STYLE} horizontal={false} />
              <XAxis
                type="number"
                stroke={CHART_AXIS_STYLE.stroke}
                style={{ fontSize: CHART_AXIS_STYLE.fontSize }}
                tickFormatter={formatChartNumber}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={CHART_AXIS_STYLE.stroke}
                style={{ fontSize: CHART_AXIS_STYLE.fontSize }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                formatter={(value, _name, entry) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  const payload = entry.payload as { fullName: string; users: number; percentage: number };
                  return [
                    <div key="tooltip" className="space-y-1">
                      <div>{formatChartNumber(numValue)} tokens</div>
                      <div className="text-xs text-muted-foreground">
                        {payload.users} usuários ativos
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {payload.percentage.toFixed(1)}% do total
                      </div>
                    </div>,
                    payload.fullName,
                  ];
                }}
              />
              <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={ASTRO_COLORS[index % ASTRO_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
