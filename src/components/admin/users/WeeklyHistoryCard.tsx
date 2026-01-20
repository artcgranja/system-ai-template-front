'use client';

import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { WeeklyUsageSummary } from '@/types/analytics';

interface WeeklyHistoryCardProps {
  weeklyHistory: WeeklyUsageSummary[];
}

/**
 * Formats large token numbers to human-readable format
 */
function formatTokens(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}


/**
 * Card component displaying weekly usage history
 * Shows a table with weekly summaries and usage percentages
 */
export function WeeklyHistoryCard({ weeklyHistory }: WeeklyHistoryCardProps) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 6;
  
  // Sort by week start date (most recent first)
  const sortedHistory = [...weeklyHistory].sort(
    (a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime()
  );
  
  const totalPages = Math.ceil(sortedHistory.length / itemsPerPage);
  const paginatedHistory = sortedHistory.slice(
    page * itemsPerPage,
    (page + 1) * itemsPerPage
  );

  if (weeklyHistory.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Historico Semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Sem historico disponivel
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Historico Semanal
            </CardTitle>
            <CardDescription>
              Ultimas {weeklyHistory.length} semanas de uso
            </CardDescription>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                  Semana
                </th>
                <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                  Tokens Normalizados
                </th>
                <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                  Requisicoes
                </th>
                <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                  Conversas
                </th>
                <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">
                  Dias Ativos
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedHistory.map((week) => (
                <tr key={week.weekStart} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-3 text-sm">
                    {format(new Date(week.weekStart), "dd/MM", { locale: ptBR })} - {' '}
                    {format(new Date(week.weekEnd), "dd/MM", { locale: ptBR })}
                  </td>
                  <td className="py-2 px-3 text-sm text-right font-mono">
                    {formatTokens(week.normalizedTokens)}
                  </td>
                  <td className="py-2 px-3 text-sm text-right">
                    {week.requestCount.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 px-3 text-sm text-right">
                    {week.conversationCount.toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2 px-3 text-sm text-right">
                    {week.activeDays}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

