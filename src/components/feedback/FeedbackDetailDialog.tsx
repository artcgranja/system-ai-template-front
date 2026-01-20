'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, MessageSquare, Calendar, User } from 'lucide-react';
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
import { CATEGORY_LABELS, STATUS_LABELS, canEditFeedback, canDeleteFeedback } from '@/types/feedback';
import { cn } from '@/lib/utils';
import { getStatusBadgeColor, getCategoryBadgeColor } from './utils';

interface FeedbackDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: Feedback | null;
  onEdit?: (feedback: Feedback) => void;
  onDelete?: (feedback: Feedback) => void;
  isLoading?: boolean;
}

/**
 * Dialog component to display full feedback details
 */
export function FeedbackDetailDialog({
  open,
  onOpenChange,
  feedback,
  onEdit,
  onDelete,
  isLoading = false,
}: FeedbackDetailDialogProps) {
  if (!feedback) {
    return null;
  }

  const canEdit = canEditFeedback(feedback);
  const canDelete = canDeleteFeedback(feedback);
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
            Detalhes completos do seu feedback
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
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full sm:w-auto">
            {canEdit && onEdit && (
              <Button
                variant="outline"
                onClick={() => {
                  handleClose();
                  onEdit(feedback);
                }}
                disabled={isLoading}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                variant="outline"
                onClick={() => {
                  handleClose();
                  onDelete(feedback);
                }}
                disabled={isLoading}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
              </Button>
            )}
            <Button onClick={handleClose} disabled={isLoading}>
              Fechar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
