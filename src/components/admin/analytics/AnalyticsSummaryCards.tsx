'use client';

import { Coins, MessageSquare, Users, TrendingUp, TrendingDown, Clock, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AnalyticsSummary } from '@/types/analytics';

interface AnalyticsSummaryCardsProps {
  summary?: AnalyticsSummary;
  isLoading?: boolean;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

function ChangeIndicator({ value, suffix = '%' }: { value: number; suffix?: string }) {
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
  isLoading,
}: {
  title: string;
  value: string;
  change?: number;
  icon: React.ElementType;
  subtitle?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

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

export function AnalyticsSummaryCards({ summary, isLoading }: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total de Tokens"
        value={summary ? formatNumber(summary.totalNormalizedTokens) : '-'}
        change={summary?.tokensChangePercent}
        icon={Coins}
        subtitle="vs. periodo anterior"
        isLoading={isLoading}
      />
      <StatCard
        title="Total de Requisicoes"
        value={summary ? formatNumber(summary.totalRequests) : '-'}
        change={summary?.requestsChangePercent}
        icon={MessageSquare}
        subtitle="vs. periodo anterior"
        isLoading={isLoading}
      />
      <StatCard
        title="Usuarios Ativos"
        value={summary ? formatNumber(summary.totalUsers) : '-'}
        icon={Users}
        subtitle={summary ? `${summary.totalConversations} conversas` : undefined}
        isLoading={isLoading}
      />
      <StatCard
        title="Media por Requisicao"
        value={summary ? formatNumber(Math.round(summary.avgTokensPerRequest)) : '-'}
        icon={Clock}
        isLoading={isLoading}
      />
    </div>
  );
}
