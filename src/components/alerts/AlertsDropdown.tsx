'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Check, CheckCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAlerts } from '@/lib/hooks/useAlerts';
import { cn } from '@/lib/utils';
import type { QuotaAlert } from '@/types/rbac';

interface AlertsDropdownProps {
  className?: string;
}

export function AlertsDropdown({ className }: AlertsDropdownProps) {
  const {
    alerts,
    unreadCount,
    hasUnreadAlerts,
    acknowledge,
    acknowledgeAll,
    isAcknowledging,
    getAlertSeverity,
    getAlertMessage,
  } = useAlerts();

  const [open, setOpen] = useState(false);

  const getSeverityIcon = (severity: 'info' | 'warning' | 'error') => {
    switch (severity) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const handleAcknowledge = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await acknowledge(alertId);
  };

  const handleAcknowledgeAll = async () => {
    await acknowledgeAll();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={`Alertas${hasUnreadAlerts ? ` (${unreadCount} nao lidos)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {hasUnreadAlerts && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Alertas</span>
          {hasUnreadAlerts && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAcknowledgeAll}
              disabled={isAcknowledging}
              className="h-auto py-1 px-2 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todos como lidos
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {alerts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum alerta
            </div>
          ) : (
            alerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                isAcknowledging={isAcknowledging}
                getAlertSeverity={getAlertSeverity}
                getAlertMessage={getAlertMessage}
                getSeverityIcon={getSeverityIcon}
              />
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface AlertItemProps {
  alert: QuotaAlert;
  onAcknowledge: (alertId: string, e: React.MouseEvent) => void;
  isAcknowledging: boolean;
  getAlertSeverity: (alertType: QuotaAlert['alertType']) => 'info' | 'warning' | 'error';
  getAlertMessage: (alert: QuotaAlert) => string;
  getSeverityIcon: (severity: 'info' | 'warning' | 'error') => React.ReactNode;
}

function AlertItem({
  alert,
  onAcknowledge,
  isAcknowledging,
  getAlertSeverity,
  getAlertMessage,
  getSeverityIcon,
}: AlertItemProps) {
  const severity = getAlertSeverity(alert.alertType);
  const isUnread = !alert.acknowledgedAt;

  return (
    <DropdownMenuItem
      className={cn(
        'flex items-start gap-3 p-3 cursor-default focus:bg-accent',
        isUnread && 'bg-accent/50'
      )}
    >
      <div className="mt-0.5">{getSeverityIcon(severity)}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', isUnread && 'font-medium')}>{getAlertMessage(alert)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(alert.createdAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </p>
      </div>
      {isUnread && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={(e) => onAcknowledge(alert.id, e)}
          disabled={isAcknowledging}
        >
          <Check className="h-3 w-3" />
        </Button>
      )}
    </DropdownMenuItem>
  );
}

export default AlertsDropdown;
