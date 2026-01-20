'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminDashboard } from '@/lib/hooks/useAdmin';
import { WeeklyUsageDashboard } from '@/components/admin/dashboard/WeeklyUsageDashboard';
import { formatTokens } from '@/lib/utils/formatters';
import type { AdminDashboard } from '@/types/rbac';

interface AdminDashboardClientProps {
  initialData: AdminDashboard | null;
}

/**
 * Admin Dashboard Client Component
 * Receives initial data from server, handles interactivity and refetch
 */
export function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const { dashboard, isLoading, error, refetch } = useAdminDashboard();

  // Use server data on first render, then client data takes over
  const data = dashboard ?? initialData;
  const showLoading = isLoading && !data;

  // Refetch on mount to ensure fresh data (optional, can be removed if not needed)
  useEffect(() => {
    if (initialData) {
      // Data was prefetched, no need to refetch immediately
      return;
    }
    // If no initial data, trigger fetch
    refetch();
  }, [initialData, refetch]);

  if (showLoading) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    const getErrorMessage = (): string => {
      if (error instanceof Error) {
        return error.message;
      }
      if (typeof error === 'string') {
        return error;
      }
      return 'Ocorreu um erro inesperado. Tente novamente.';
    };

    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive">Erro ao carregar dashboard: {getErrorMessage()}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">Visao geral do sistema</p>
      </div>

      {/* Weekly Usage Dashboard */}
      {data.weeklyUsage && (
        <WeeklyUsageDashboard weeklyUsage={data.weeklyUsage} />
      )}

      {/* Alert Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className={data.usersNearLimit > 0 ? 'border-yellow-500/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Proximos do Limite</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${data.usersNearLimit > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.usersNearLimit}</div>
            <p className="text-xs text-muted-foreground">
              usuarios com mais de 80% da cota usada
            </p>
            {data.usersNearLimit > 0 && (
              <Link href="/admin/quotas?filter=near_limit">
                <Button variant="link" size="sm" className="px-0 mt-2">
                  Ver usuarios
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className={data.suspendedUsers > 0 ? 'border-red-500/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Suspensos</CardTitle>
            <Ban
              className={`h-4 w-4 ${data.suspendedUsers > 0 ? 'text-red-500' : 'text-muted-foreground'}`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.suspendedUsers}</div>
            <p className="text-xs text-muted-foreground">usuarios com acesso bloqueado</p>
            {data.suspendedUsers > 0 && (
              <Link href="/admin/quotas?filter=suspended">
                <Button variant="link" size="sm" className="px-0 mt-2">
                  Gerenciar
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Usuarios por Uso
              </CardTitle>
              <CardDescription>Usuarios que mais consomem tokens</CardDescription>
            </div>
            <Link href="/admin/quotas">
              <Button variant="outline" size="sm">
                Ver todos
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {data.topUsersByUsage.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum dado de uso ainda</p>
          ) : (
            <div className="space-y-4">
              {data.topUsersByUsage.map((user, index) => (
                <div key={user.userId} className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTokens(user.currentUsage)} tokens
                    </p>
                  </div>
                  <div className="w-32">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Cota</span>
                      <span className="font-medium">{user.percentageUsed.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          user.percentageUsed >= 90
                            ? 'bg-red-500'
                            : user.percentageUsed >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(user.percentageUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48 mt-2" />
      </div>

      {/* Weekly Usage Dashboard Skeleton */}
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>

      {/* Top Users Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="w-32 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
