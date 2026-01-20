'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquare, Calendar, User, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Feedback } from '@/types/feedback';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/types/feedback';
import { getStatusBadgeColor, getCategoryBadgeColor } from '@/components/feedback/utils';
import { cn } from '@/lib/utils';

interface AdminFeedbackDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: Feedback | null;
  onRespond?: (feedback: Feedback) => void;
  isLoading?: boolean;
}

/**
 * Dialog component to display full feedback details for admin
 */
export function AdminFeedbackDetailDialog({
  open,
  onOpenChange,
  feedback,
  onRespond,
  isLoading = false,
}: AdminFeedbackDetailDialogProps) {
  if (!feedback) {
    return null;
  }

  const hasAdminResponse = !!feedback.admin_response;

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{feedback.title}</DialogTitle>
          <DialogDescription>
            Detalhes completos do feedback
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                getCategoryBadgeColor(feedback.category)
              )}
            >
              {CATEGORY_LABELS[feedback.category]}
            </span>
            <span
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                getStatusBadgeColor(feedback.status)
              )}
            >
              {STATUS_LABELS[feedback.status]}
            </span>
          </div>

          {/* User Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono">{feedback.user_id}</p>
            </CardContent>
          </Card>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Descrição</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {feedback.description}
            </p>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <div>
                <p className="font-medium">Criado em</p>
                <p>
                  {format(new Date(feedback.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
            {feedback.updated_at !== feedback.created_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <div>
                  <p className="font-medium">Atualizado em</p>
                  <p>
                    {format(new Date(feedback.updated_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Admin Response */}
          {hasAdminResponse && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Resposta da Administração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{feedback.admin_response}</p>
                {feedback.admin_response_at && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>
                      Respondido em{' '}
                      {format(
                        new Date(feedback.admin_response_at),
                        "dd 'de' MMMM 'de' yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )}
                    </span>
                    {feedback.admin_response_by && (
                      <span className="ml-2 font-mono">
                        por {feedback.admin_response_by.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full sm:w-auto">
            {onRespond && (
              <Button
                onClick={() => {
                  handleClose();
                  onRespond(feedback);
                }}
                disabled={isLoading}
              >
                <Edit className="h-4 w-4 mr-2" />
                {hasAdminResponse ? 'Atualizar Resposta' : 'Responder'}
              </Button>
            )}
            <Button onClick={handleClose} disabled={isLoading} variant="outline">
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
