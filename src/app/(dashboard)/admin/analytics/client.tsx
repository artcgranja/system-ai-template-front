'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, Search, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useTokenUsageAnalytics, useAdminDepartments } from '@/lib/hooks/useAdmin';
import {
  TokenUsageChart,
  AnalyticsSummaryCards,
  DepartmentBreakdown,
  UserBreakdownTable,
} from '@/components/admin/analytics';
import { cn } from '@/lib/utils';
import { regroupTimeSeriesData } from '@/lib/utils/analytics';
import type { AnalyticsPeriod, AnalyticsGroupBy, TokenUsageAnalytics } from '@/types/analytics';
import type { Department } from '@/types/rbac';

const periodOptions: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'last_7_days', label: 'Ultimos 7 dias' },
  { value: 'last_14_days', label: 'Ultimos 14 dias' },
  { value: 'last_30_days', label: 'Ultimos 30 dias' },
  { value: 'last_60_days', label: 'Ultimos 60 dias' },
  { value: 'last_90_days', label: 'Ultimos 90 dias' },
  { value: 'last_180_days', label: 'Ultimos 180 dias' },
  { value: 'last_1_year', label: 'Ultimo ano' },
  { value: 'last_2_years', label: 'Ultimos 2 anos' },
];

interface AdminAnalyticsClientProps {
  initialAnalytics: TokenUsageAnalytics | null;
  initialDepartments: Department[];
}

/**
 * Admin Analytics Client Component
 * Receives initial data from server, handles filters and interactivity
 */
export function AdminAnalyticsClient({
  initialAnalytics,
  initialDepartments,
}: AdminAnalyticsClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>('last_30_days');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>('day');

  const {
    summary,
    timeSeries,
    departmentBreakdown,
    userBreakdown,
    periodStart,
    periodEnd,
    isLoading,
    isFetching,
    refetch,
    updateParams,
  } = useTokenUsageAnalytics({
    period: selectedPeriod,
    departmentIds: selectedDepartment ? [selectedDepartment] : undefined,
    userSearch: searchQuery.trim() || undefined,
    pageSize: 10,
  });

  // Use server data if client data not available yet
  const currentSummary = summary ?? initialAnalytics?.summary;
  const currentTimeSeries = timeSeries ?? initialAnalytics?.timeSeries;
  const currentDepartmentBreakdown = departmentBreakdown.length > 0
    ? departmentBreakdown
    : initialAnalytics?.departmentBreakdown ?? [];
  const currentUserBreakdown = userBreakdown ?? initialAnalytics?.userBreakdown;
  const currentPeriodStart = periodStart ?? initialAnalytics?.periodStart;
  const currentPeriodEnd = periodEnd ?? initialAnalytics?.periodEnd;

  // Regroup data locally based on selected groupBy
  const regroupedDataPoints = useMemo(() => {
    if (!currentTimeSeries?.dataPoints) return [];
    return regroupTimeSeriesData(currentTimeSeries.dataPoints, groupBy);
  }, [currentTimeSeries?.dataPoints, groupBy]);

  const { departments } = useAdminDepartments();
  const currentDepartments = departments.length > 0 ? departments : initialDepartments;

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    setSelectedPeriod(period);
    updateParams({ period });
  };

  const handleDepartmentChange = (departmentId: string) => {
    setSelectedDepartment(departmentId);
    updateParams({
      departmentIds: departmentId ? [departmentId] : undefined,
    });
  };

  const handleGroupByChange = (newGroupBy: AnalyticsGroupBy) => {
    setGroupBy(newGroupBy);
  };

  const handleSearchSubmit = () => {
    updateParams({ userSearch: searchQuery.trim() || undefined });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedPeriod('last_30_days');
    setSelectedDepartment('');
    setGroupBy('day');
    updateParams({
      period: 'last_30_days',
      departmentIds: undefined,
      userSearch: undefined,
    });
  };

  const handlePageChange = (page: number) => {
    updateParams({ page });
  };

  const periodLabel = useMemo(() => {
    if (currentPeriodStart && currentPeriodEnd) {
      try {
        const start = new Date(currentPeriodStart);
        const end = new Date(currentPeriodEnd);
        return `${format(start, 'dd/MM/yyyy', { locale: ptBR })} - ${format(end, 'dd/MM/yyyy', { locale: ptBR })}`;
      } catch {
        return '';
      }
    }
    return '';
  }, [currentPeriodStart, currentPeriodEnd]);

  // Show full page skeleton only on initial load with no server data
  const isInitialLoading = isLoading && !currentSummary && !initialAnalytics;

  if (isInitialLoading) {
    return <AnalyticsPageSkeleton />;
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics de Uso de Tokens</h1>
          <p className="text-muted-foreground">
            Visualize o consumo de tokens do sistema
            {periodLabel && <span className="ml-2 text-sm">({periodLabel})</span>}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
          {isFetching ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Period Select */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                className="h-10 rounded-md border border-input bg-background pl-10 pr-3 text-sm min-w-[180px]"
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value as AnalyticsPeriod)}
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Select */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                className="h-10 rounded-md border border-input bg-background pl-10 pr-3 text-sm min-w-[180px]"
                value={selectedDepartment}
                onChange={(e) => handleDepartmentChange(e.target.value)}
              >
                <option value="">Todos os departamentos</option>
                {currentDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* User Search */}
            <div className="relative flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuario..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="secondary" size="sm" onClick={handleSearchSubmit}>
                Buscar
              </Button>
            </div>

            {/* Reset Button */}
            <Button variant="ghost" onClick={handleResetFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content area with subtle opacity during refetch */}
      <div className={cn('space-y-6 transition-opacity duration-200', isFetching && 'opacity-60')}>
        {/* Summary Cards */}
        <AnalyticsSummaryCards summary={currentSummary} />

        {/* Time Series Chart */}
        <TokenUsageChart
          dataPoints={regroupedDataPoints}
          grouping={groupBy}
          onGroupByChange={handleGroupByChange}
        />

        {/* Department and Model Breakdown */}
        <div className="grid gap-6 lg:grid-cols-2">
          <DepartmentBreakdown departments={currentDepartmentBreakdown} />

          {/* Model Breakdown Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Distribuicao por Modelo</CardTitle>
            </CardHeader>
            <CardContent>
              {currentDepartmentBreakdown.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhum dado disponivel
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">Total Input Tokens</p>
                        <p className="text-sm text-muted-foreground">Tokens de entrada processados</p>
                      </div>
                      <p className="text-xl font-bold text-primary">
                        {currentSummary?.totalInputTokens.toLocaleString('pt-BR') ?? '-'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">Total Output Tokens</p>
                        <p className="text-sm text-muted-foreground">Tokens de saida gerados</p>
                      </div>
                      <p className="text-xl font-bold text-primary">
                        {currentSummary?.totalOutputTokens.toLocaleString('pt-BR') ?? '-'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
                      <div>
                        <p className="font-medium">Tokens Normalizados</p>
                        <p className="text-sm text-muted-foreground">Input x 0.3 + Output x 1.0</p>
                      </div>
                      <p className="text-xl font-bold text-primary">
                        {currentSummary?.totalNormalizedTokens.toLocaleString('pt-BR') ?? '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* User Breakdown Table */}
        <UserBreakdownTable
          userBreakdown={currentUserBreakdown}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}

function AnalyticsPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-24" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <Skeleton className="h-[400px]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[350px]" />
        <Skeleton className="h-[350px]" />
      </div>
      <Skeleton className="h-[400px]" />
    </div>
  );
}
