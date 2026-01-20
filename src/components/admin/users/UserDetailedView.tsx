'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/hooks/config/queryConfig';
import type {
  UserProfileInfo,
  CurrentQuotaStatus,
  QuotaSettingsInfo,
  UsageAnalytics,
  ActivityStats,
  AnalyticsPeriod,
  AnalyticsGroupBy
} from '@/types/analytics';
import { QuotaStatusCard } from './QuotaStatusCard';
import { ActivityStatsCard } from './ActivityStatsCard';
import { BarChart3, PieChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyBreakdownChart, ModelBreakdownChart } from './UsageAnalyticsCard';

interface UserDetailedViewProps {
  userProfile: UserProfileInfo;
  currentQuotaStatus: CurrentQuotaStatus;
  quotaSettings: QuotaSettingsInfo;
  usageAnalytics: UsageAnalytics;
  activityStats: ActivityStats;
  generatedAt: string;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
}

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'last_7_days', label: 'Ultimos 7 dias' },
  { value: 'last_14_days', label: 'Ultimos 14 dias' },
  { value: 'last_30_days', label: 'Ultimos 30 dias' },
  { value: 'last_60_days', label: 'Ultimos 60 dias' },
  { value: 'last_90_days', label: 'Ultimos 90 dias' },
];

/**
 * Main component for displaying detailed user analytics
 * Composes multiple card components to show a complete user view
 */
export function UserDetailedView({
  userProfile,
  currentQuotaStatus,
  quotaSettings,
  usageAnalytics,
  activityStats,
  generatedAt,
  period,
  onPeriodChange,
}: UserDetailedViewProps) {
  const queryClient = useQueryClient();
  const [grouping, setGrouping] = useState<AnalyticsGroupBy>('day');

  /**
   * Callback when quota is updated
   * Invalidates the cache to refresh data
   */
  const handleQuotaUpdated = () => {
    queryClient.invalidateQueries({ 
      queryKey: QUERY_KEYS.adminUserDetailedAnalytics(userProfile.userId) 
    });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminQuotas });
  };

  return (
    <div className="space-y-6">
      {/* Period Selector and Metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Periodo:</label>
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as AnalyticsPeriod)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Gerado em {format(new Date(generatedAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
        </div>
      </div>

      {/* Activity Stats */}
      <ActivityStatsCard activityStats={activityStats} />

      {/* Daily Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Uso Diario
          </CardTitle>
          <CardDescription>
            {format(new Date(usageAnalytics.periodStart), "dd 'de' MMMM", { locale: ptBR })} - {' '}
            {format(new Date(usageAnalytics.periodEnd), "dd 'de' MMMM", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DailyBreakdownChart 
            dataPoints={usageAnalytics.dailyBreakdown}
            grouping={grouping}
            onGroupByChange={setGrouping}
          />
        </CardContent>
      </Card>

      {/* Quota Status and Model Breakdown */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <QuotaStatusCard
          currentQuotaStatus={currentQuotaStatus}
          quotaSettings={quotaSettings}
          userProfile={userProfile}
          onQuotaUpdated={handleQuotaUpdated}
        />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Uso por Modelo
            </CardTitle>
            <CardDescription>
              Distribuicao de tokens por modelo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModelBreakdownChart models={usageAnalytics.modelBreakdown} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

