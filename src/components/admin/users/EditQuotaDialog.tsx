'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminApi } from '@/lib/api/admin';
import { QUERY_KEYS } from '@/lib/hooks/config/queryConfig';
import type { QuotaSettingsInfo } from '@/types/analytics';

interface EditQuotaDialogProps {
  userId: string;
  userName: string;
  currentSettings: QuotaSettingsInfo;
  onClose: () => void;
  onSuccess?: () => void;
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
 * Reusable dialog component for editing user quota settings
 * Can be used from both the quotas page and user detail page
 */
export function EditQuotaDialog({
  userId,
  userName,
  currentSettings,
  onClose,
  onSuccess,
}: EditQuotaDialogProps) {
  const queryClient = useQueryClient();
  
  const [weeklyQuota, setWeeklyQuota] = useState(
    currentSettings.weeklyQuotaNormalized ?? 2000000
  );
  const [isUnlimited, setIsUnlimited] = useState(currentSettings.isUnlimited);

  // Mutation for updating quota
  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateQuota(userId, {
      weeklyQuotaNormalized: isUnlimited ? undefined : weeklyQuota,
      isUnlimited,
    }),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminQuotas });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.adminUserDetailedAnalytics(userId) 
      });
      onSuccess?.();
    },
  });

  const handleSave = async () => {
    await updateMutation.mutateAsync();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Cota</DialogTitle>
          <DialogDescription>
            Altere a cota semanal de tokens para {userName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Settings Info */}
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm text-muted-foreground mb-1">Configuracao atual</p>
            <p className="text-sm font-medium">
              {currentSettings.isUnlimited 
                ? 'Cota ilimitada' 
                : `${formatTokens(currentSettings.weeklyQuotaNormalized ?? 0)} tokens/semana`
              }
            </p>
            {currentSettings.isSuspended && (
              <p className="text-sm text-red-500 mt-1">Usuario suspenso</p>
            )}
          </div>

          {/* Unlimited Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="unlimited"
              checked={isUnlimited}
              onChange={(e) => setIsUnlimited(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="unlimited" className="text-sm font-medium">
              Cota ilimitada
            </label>
          </div>

          {/* Quota Input */}
          {!isUnlimited && (
            <div>
              <label className="text-sm font-medium">Cota semanal (tokens normalizados)</label>
              <Input
                type="number"
                value={weeklyQuota}
                onChange={(e) => setWeeklyQuota(Number(e.target.value))}
                className="mt-1"
                min={0}
                step={100000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Equivale a aproximadamente {formatTokens(weeklyQuota)} tokens
              </p>
            </div>
          )}

          {/* Error Message */}
          {updateMutation.isError && (
            <p className="text-sm text-red-500">
              Erro ao atualizar cota. Tente novamente.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

