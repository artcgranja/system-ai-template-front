'use client';

import { useState } from 'react';
import { Clock, TrendingUp, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CurrentQuotaStatus, QuotaSettingsInfo, UserProfileInfo } from '@/types/analytics';
import { EditQuotaDialog } from './EditQuotaDialog';

interface QuotaStatusCardProps {
  currentQuotaStatus: CurrentQuotaStatus;
  quotaSettings: QuotaSettingsInfo;
  userProfile: UserProfileInfo;
  onQuotaUpdated?: () => void;
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
 * Returns a color class based on usage percentage
 */
function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-500';
  if (percentage >= 70) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * Returns a progress bar color class based on usage percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Card component displaying current quota usage status
 * Shows usage progress bar, remaining tokens, and reset time
 */
export function QuotaStatusCard({ 
  currentQuotaStatus, 
  quotaSettings,
  userProfile,
  onQuotaUpdated 
}: QuotaStatusCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const isUnlimited = quotaSettings.isUnlimited;
  const percentage = Math.min(currentQuotaStatus.percentageUsed, 100);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Status da Cota
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar Cota
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {isUnlimited ? (
          <div className="text-center py-4">
            <p className="text-2xl font-bold text-primary">Ilimitado</p>
            <p className="text-sm text-muted-foreground">
              {formatTokens(currentQuotaStatus.currentUsage)} tokens usados
            </p>
          </div>
        ) : (
          <>
            {/* Usage Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uso do Periodo</span>
                <span className={cn("text-sm font-medium", getUsageColor(percentage))}>
                  {percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", getProgressColor(percentage))}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Usage Details */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Usado</p>
                <p className="text-lg font-semibold">
                  {formatTokens(currentQuotaStatus.currentUsage)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Restante</p>
                <p className="text-lg font-semibold text-green-600">
                  {formatTokens(currentQuotaStatus.remaining)}
                </p>
              </div>
            </div>

            {/* Quota Limit */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Limite</span>
                <span className="text-sm font-medium">
                  {formatTokens(currentQuotaStatus.quotaLimit)} tokens
                </span>
              </div>
            </div>
          </>
        )}

        {/* Reset Time */}
        <div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Renova em {format(new Date(currentQuotaStatus.periodResetsAt), "dd 'de' MMMM 'as' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </CardContent>
    </Card>

    {/* Edit Quota Dialog */}
    {showEditDialog && (
      <EditQuotaDialog
        userId={userProfile.userId}
        userName={userProfile.fullName}
        currentSettings={quotaSettings}
        onClose={() => setShowEditDialog(false)}
        onSuccess={() => {
          setShowEditDialog(false);
          onQuotaUpdated?.();
        }}
      />
    )}
    </>
  );
}

