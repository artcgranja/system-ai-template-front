'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Clock, Ban } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuota } from '@/lib/hooks/useQuota';

interface QuotaModalProps {
  open: boolean;
  onClose: () => void;
  type?: 'exceeded' | 'suspended' | 'warning';
  warningMessage?: string;
}

export function QuotaModal({ open, onClose, type = 'exceeded', warningMessage }: QuotaModalProps) {
  const { quota, formatTokens } = useQuota();

  const resetDate = quota?.periodResetsAt
    ? format(new Date(quota.periodResetsAt), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
    : null;

  // Content based on type
  const content = {
    exceeded: {
      icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
      title: 'Cota de Tokens Excedida',
      description: `Sua cota semanal de tokens foi excedida. Você usou ${formatTokens(quota?.currentUsage ?? 0)} de ${formatTokens(quota?.quotaLimit ?? 0)} tokens disponíveis.`,
      action: 'Entendido',
    },
    suspended: {
      icon: <Ban className="h-12 w-12 text-red-500" />,
      title: 'Conta Suspensa',
      description:
        'Sua conta está temporariamente suspensa. Entre em contato com o administrador para mais informações.',
      action: 'Entendido',
    },
    warning: {
      icon: <Clock className="h-12 w-12 text-yellow-500" />,
      title: 'Alerta de Cota',
      description:
        warningMessage ||
        `Atenção: Você já usou ${(Number(quota?.percentageUsed) || 0).toFixed(0)}% da sua cota semanal.`,
      action: 'Continuar',
    },
  }[type];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="mb-4">{content.icon}</div>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription className="text-center">{content.description}</DialogDescription>
        </DialogHeader>

        {type === 'exceeded' && resetDate && (
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Sua cota sera renovada em:</p>
            <p className="text-lg font-semibold text-foreground">{resetDate}</p>
          </div>
        )}

        {type === 'warning' && quota && (
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(Number(quota.percentageUsed) || 0, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTokens(quota.remaining)} restantes</span>
              <span>{(Number(quota.percentageUsed) || 0).toFixed(0)}% usado</span>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-center sm:justify-center">
          <Button onClick={onClose} className="min-w-[120px]">
            {content.action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuotaModal;
