'use client';

import { use } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useUserDetailedAnalytics } from '@/lib/hooks/useAdmin';
import { UserDetailedView } from '@/components/admin/users/UserDetailedView';

interface UserDetailPageProps {
  params: Promise<{
    userId: string;
  }>;
}

/**
 * User Detail Page - displays detailed analytics and quota information for a specific user
 * Accessible from both the analytics user breakdown table and the users management page
 */
export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { userId } = use(params);
  
  const {
    detailedAnalytics,
    userProfile,
    currentQuotaStatus,
    quotaSettings,
    usageAnalytics,
    activityStats,
    isLoading,
    isFetching,
    error,
    refetch,
    params: analyticsParams,
    updateParams,
  } = useUserDetailedAnalytics(userId, {
    period: 'last_30_days',
  });

  // Loading state
  if (isLoading) {
    return <UserDetailPageSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-lg text-muted-foreground mb-4">
            Erro ao carregar dados do usuario
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // Not found state
  if (!detailedAnalytics || !userProfile) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-lg text-muted-foreground">
            Usuario nao encontrado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>
        
        {/* User info */}
        <div>
          <h1 className="text-3xl font-bold">{userProfile.fullName}</h1>
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mt-1">
            <p className="text-muted-foreground">{userProfile.email}</p>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <p className="text-muted-foreground">{userProfile.roleName}</p>
            <span className="hidden md:inline text-muted-foreground">•</span>
            <p className="text-muted-foreground">{userProfile.departmentName}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={cn('transition-opacity duration-200', isFetching && 'opacity-60')}>
        <UserDetailedView
          userProfile={userProfile}
          currentQuotaStatus={currentQuotaStatus!}
          quotaSettings={quotaSettings!}
          usageAnalytics={usageAnalytics!}
          activityStats={activityStats!}
          generatedAt={detailedAnalytics.generatedAt}
          period={analyticsParams.period || 'last_30_days'}
          onPeriodChange={(period) => updateParams({ period })}
        />
      </div>
    </div>
  );
}

/**
 * Skeleton component shown while loading
 */
function UserDetailPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-4">
        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
        {/* User info */}
        <div>
          <Skeleton className="h-9 w-64" />
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 mt-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32 hidden md:block" />
            <Skeleton className="h-5 w-24 hidden md:block" />
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-40" />
      </div>

      {/* Activity Stats */}
      <Skeleton className="h-32" />

      {/* Daily Usage Chart */}
      <Skeleton className="h-[450px]" />

      {/* Quota Status and Model Breakdown */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

