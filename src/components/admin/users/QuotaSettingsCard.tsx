'use client';

import { useState } from 'react';
import { Settings, Edit2, Infinity, Ban, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { QuotaSettingsInfo, UserProfileInfo } from '@/types/analytics';
import { EditQuotaDialog } from './EditQuotaDialog';

interface QuotaSettingsCardProps {
  quotaSettings: QuotaSettingsInfo;
  userProfile: UserProfileInfo;
  onQuotaUpdated?: () => void;
}

/**
 * Formats large token numbers to human-readable format
 */
function formatTokens(value: number | null): string {
  if (value === null) return '-';
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

/**
 * Card component displaying quota configuration settings
 * Shows weekly/monthly/daily limits and allows editing
 */
export function QuotaSettingsCard({ 
  quotaSettings, 
  userProfile,
  onQuotaUpdated 
}: QuotaSettingsCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuracoes de Cota
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            {quotaSettings.isUnlimited && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm">
                <Infinity className="h-4 w-4" />
                Ilimitado
              </span>
            )}
            {quotaSettings.isSuspended ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm">
                <Ban className="h-4 w-4" />
                Suspenso
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm">
                <CheckCircle className="h-4 w-4" />
                Ativo
              </span>
            )}
          </div>

          {/* Quota Limits */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cota Semanal</span>
              <span className={cn(
                "text-sm font-medium",
                quotaSettings.weeklyQuotaNormalized ? "" : "text-muted-foreground"
              )}>
                {quotaSettings.isUnlimited 
                  ? 'Ilimitado' 
                  : `${formatTokens(quotaSettings.weeklyQuotaNormalized)} tokens`
                }
              </span>
            </div>
            
            {quotaSettings.monthlyQuotaNormalized && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cota Mensal</span>
                <span className="text-sm font-medium">
                  {formatTokens(quotaSettings.monthlyQuotaNormalized)} tokens
                </span>
              </div>
            )}
            
            {quotaSettings.dailyQuotaNormalized && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cota Diaria</span>
                <span className="text-sm font-medium">
                  {formatTokens(quotaSettings.dailyQuotaNormalized)} tokens
                </span>
              </div>
            )}
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

