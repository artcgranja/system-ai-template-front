'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Edit, Trash2, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Feedback } from '@/types/feedback';
import { CATEGORY_LABELS, STATUS_LABELS, canEditFeedback, canDeleteFeedback } from '@/types/feedback';
import { cn } from '@/lib/utils';
import { getStatusBadgeColor, getCategoryBadgeColor } from './utils';

interface FeedbackCardProps {
  feedback: Feedback;
  onView: (feedback: Feedback) => void;
  onEdit?: (feedback: Feedback) => void;
  onDelete?: (feedback: Feedback) => void;
}

/**
 * Card component to display a feedback item in the list
 */
export function FeedbackCard({ feedback, onView, onEdit, onDelete }: FeedbackCardProps) {
  const canEdit = canEditFeedback(feedback);
  const canDelete = canDeleteFeedback(feedback);
  const hasAdminResponse = !!feedback.admin_response;

  const truncatedDescription =
    feedback.description.length > 150
      ? `${feedback.description.substring(0, 150)}...`
      : feedback.description;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{feedback.title}</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  getCategoryBadgeColor(feedback.category)
                )}
              >
                {CATEGORY_LABELS[feedback.category]}
              </span>
              <span
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium',
                  getStatusBadgeColor(feedback.status)
                )}
              >
                {STATUS_LABELS[feedback.status]}
              </span>
              {hasAdminResponse && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Respondido
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {truncatedDescription}
        </p>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {format(new Date(feedback.created_at), "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(feedback)}
              className="h-8"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            {canEdit && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(feedback)}
                className="h-8"
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
            {canDelete && onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(feedback)}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Deletar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
