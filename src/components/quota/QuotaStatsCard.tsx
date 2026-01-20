'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Zap, ArrowUpDown, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuotaStats, useQuota } from '@/lib/hooks/useQuota';
import { cn } from '@/lib/utils';
import type { QuotaPeriod } from '@/types/rbac';

interface QuotaStatsCardProps {
  className?: string;
}

export function QuotaStatsCard({ className }: QuotaStatsCardProps) {
  const [period, setPeriod] = useState<QuotaPeriod>('week');
  const { stats, isLoading } = useQuotaStats(period);
  const { formatTokens, getQuotaColor } = useQuota();

  const periodLabels: Record<QuotaPeriod, string> = {
    day: 'Hoje',
    week: 'Esta Semana',
    month: 'Este Mes',
  };

  if (isLoading || !stats) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-24 bg-muted rounded" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const percentageUsed = Number(stats.percentageUsed ?? 0);
  const color = getQuotaColor(percentageUsed);
  const barColorClass = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }[color];

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Uso de Tokens</CardTitle>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as QuotaPeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-7 px-2 text-xs"
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cota utilizada</span>
            <span className="font-medium">{percentageUsed.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500 rounded-full', barColorClass)}
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTokens(stats.totalNormalized)} usados</span>
            <span>{formatTokens(stats.quotaLimit)} total</span>
          </div>
        </div>

        {/* Token Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUpDown className="h-4 w-4 text-blue-500" />
              Input
            </div>
            <p className="text-lg font-semibold">{formatTokens(stats.totalInputTokens)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowUpDown className="h-4 w-4 text-purple-500 rotate-180" />
              Output
            </div>
            <p className="text-lg font-semibold">{formatTokens(stats.totalOutputTokens)}</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalMessages}</p>
              <p className="text-xs text-muted-foreground">Mensagens</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalConversations}</p>
              <p className="text-xs text-muted-foreground">Conversas</p>
            </div>
          </div>
        </div>

        {/* Average */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Media por mensagem</span>
            <span className="font-medium">{formatTokens(stats.avgTokensPerMessage)} tokens</span>
          </div>
        </div>

        {/* Period Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(stats.periodStart), 'dd/MM', { locale: ptBR })} -{' '}
            {format(new Date(stats.periodEnd), 'dd/MM', { locale: ptBR })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuotaStatsCard;
