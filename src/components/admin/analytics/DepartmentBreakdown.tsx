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

interface DepartmentBreakdownProps {
  departments: DepartmentBreakdownType[];
  isLoading?: boolean;
}

const ASTRO_COLORS = [
  '#4F739E', // astro-500 - Astro Steel Blue (primário)
  '#6b8bb5', // astro-400 - Astro Steel Blue claro
  '#8daec9', // astro-300 - Astro Steel Blue mais claro
  '#6e4df9', // Roxo (mantido para diferenciação)
  '#ff8c42', // Laranja
  '#2e6cff', // Azul Royal
  '#ffdd00', // Amarelo
  '#ff4242', // Vermelho
];

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

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
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Nenhum dado disponivel
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickFormatter={formatNumber}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                formatter={(value: number, _name: string, entry) => {
                  const payload = entry.payload as { fullName: string; users: number; percentage: number };
                  return [
                    <div key="tooltip" className="space-y-1">
                      <div>{formatNumber(value)} tokens</div>
                      <div className="text-xs text-muted-foreground">
                        {payload.users} usuarios ativos
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
