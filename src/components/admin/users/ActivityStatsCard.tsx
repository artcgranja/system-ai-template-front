'use client';

import { Activity, Calendar, Clock, Hash, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivityStats } from '@/types/analytics';

interface ActivityStatsCardProps {
  activityStats: ActivityStats;
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
 * Translates day names to Portuguese
 */
function translateDay(day: string | null): string {
  if (!day) return '-';
  const translations: Record<string, string> = {
    'Monday': 'Segunda-feira',
    'Tuesday': 'Terca-feira',
    'Wednesday': 'Quarta-feira',
    'Thursday': 'Quinta-feira',
    'Friday': 'Sexta-feira',
    'Saturday': 'Sabado',
    'Sunday': 'Domingo',
  };
  return translations[day] || day;
}

/**
 * Card component displaying lifetime activity statistics
 * Shows first/last request, total requests/tokens, average usage, and patterns
 */
export function ActivityStatsCard({ activityStats }: ActivityStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Estatisticas de Atividade (Lifetime)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* First Request */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Primeira Requisicao
            </div>
            <p className="text-sm font-medium">
              {activityStats.firstRequestAt 
                ? format(new Date(activityStats.firstRequestAt), "dd/MM/yyyy", { locale: ptBR })
                : '-'
              }
            </p>
          </div>

          {/* Last Request */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Ultima Requisicao
            </div>
            <p className="text-sm font-medium">
              {activityStats.lastRequestAt 
                ? format(new Date(activityStats.lastRequestAt), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : '-'
              }
            </p>
          </div>

          {/* Total Requests */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="h-3 w-3" />
              Total Requisicoes
            </div>
            <p className="text-sm font-medium">
              {activityStats.totalLifetimeRequests.toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Total Tokens */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              Total Tokens
            </div>
            <p className="text-sm font-medium">
              {formatTokens(activityStats.totalLifetimeTokens)}
            </p>
          </div>

          {/* Total Normalized */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Total Normalizado
            </div>
            <p className="text-sm font-medium">
              {formatTokens(activityStats.totalLifetimeNormalized)}
            </p>
          </div>

          {/* Total Conversations */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Total Conversas
            </div>
            <p className="text-sm font-medium">
              {activityStats.totalConversations.toLocaleString('pt-BR')}
            </p>
          </div>

          {/* Average per Day */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Media Requisicoes/Dia
            </div>
            <p className="text-sm font-medium">
              {(Number(activityStats.avgRequestsPerDay) || 0).toFixed(1)}
            </p>
          </div>

          {/* Average Tokens per Request */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Media Tokens/Req
            </div>
            <p className="text-sm font-medium">
              {formatTokens(activityStats.avgTokensPerRequest)}
            </p>
          </div>
        </div>

        {/* Most Active Day and Most Used Model */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Dia Mais Ativo</span>
            <p className="text-sm font-medium mt-1">
              {translateDay(activityStats.mostActiveDay)}
            </p>
          </div>
          {activityStats.mostUsedModel && (
            <div>
              <span className="text-sm text-muted-foreground">Modelo Mais Usado</span>
              <p className="text-sm font-medium font-mono bg-muted px-2 py-1 rounded mt-1 inline-block">
                {activityStats.mostUsedModel}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

