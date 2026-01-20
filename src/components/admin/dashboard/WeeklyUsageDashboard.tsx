'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, MessageSquare, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyUsage } from '@/types/rbac';

interface WeeklyUsageDashboardProps {
  weeklyUsage: WeeklyUsage;
}

const VORA_COLORS = {
  primary: '#00f494',
  secondary: '#6e4df9',
  tertiary: '#00d9c0',
};

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

function ChangeIndicator({ value, suffix = '%' }: { value: number | null; suffix?: string }) {
  if (value === null) {
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>N/A</span>
      </span>
    );
  }

  if (value === 0) {
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>0{suffix}</span>
      </span>
    );
  }

  const isPositive = value > 0;
  return (
    <span
      className={cn(
        'flex items-center gap-1 text-sm font-medium',
        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      <span>
        {isPositive ? '+' : ''}
        {value.toFixed(1)}
        {suffix}
      </span>
    </span>
  );
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  change?: number | null;
  icon: React.ElementType;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center gap-2">
              {change !== undefined && <ChangeIndicator value={change} />}
              {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
            </div>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyUsageDashboard({ weeklyUsage }: WeeklyUsageDashboardProps) {
  const chartData = useMemo(() => {
    return weeklyUsage.dailyData.map((day) => ({
      date: format(parseISO(day.date), 'dd/MM', { locale: ptBR }),
      fullDate: day.date,
      normalizedTokens: day.normalizedTokens,
      totalTokens: day.totalTokens,
      requestCount: day.requestCount,
      uniqueUsers: day.uniqueUsers,
    }));
  }, [weeklyUsage.dailyData]);

  const weekRange = useMemo(() => {
    if (weeklyUsage.dailyData.length === 0) return '';
    const firstDate = parseISO(weeklyUsage.dailyData[0].date);
    const lastDate = parseISO(weeklyUsage.dailyData[weeklyUsage.dailyData.length - 1].date);
    return `${format(firstDate, 'dd/MM', { locale: ptBR })} - ${format(lastDate, 'dd/MM', { locale: ptBR })}`;
  }, [weeklyUsage.dailyData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Tokens Normalizados"
          value={formatNumber(weeklyUsage.summary.normalizedTokens)}
          change={weeklyUsage.previousWeekComparison.tokensChangePercent}
          icon={Coins}
          subtitle="vs. semana anterior"
        />
        <StatCard
          title="Total de Requisicoes"
          value={formatNumber(weeklyUsage.summary.totalRequests)}
          change={weeklyUsage.previousWeekComparison.requestsChangePercent}
          icon={MessageSquare}
          subtitle="vs. semana anterior"
        />
        <StatCard
          title="Usuarios Unicos"
          value={formatNumber(weeklyUsage.summary.uniqueUsers)}
          icon={Users}
          subtitle={`${weeklyUsage.summary.totalConversations} conversas`}
        />
        <StatCard
          title="Total de Tokens"
          value={formatNumber(weeklyUsage.summary.totalTokens)}
          icon={Coins}
          subtitle={weekRange}
        />
      </div>

      {/* Weekly Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Utilizacao da Semana Atual</CardTitle>
          <CardDescription>
            Dados diarios de utilizacao de tokens normalizados ({weekRange})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              Nenhum dado disponivel para esta semana
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorNormalized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={VORA_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={VORA_COLORS.primary} stopOpacity={0} />
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
                      requestCount: 'Requisicoes',
                      uniqueUsers: 'Usuarios Unicos',
                    };
                    return [value.toLocaleString('pt-BR'), labels[name] || name];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="normalizedTokens"
                  stroke={VORA_COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNormalized)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
