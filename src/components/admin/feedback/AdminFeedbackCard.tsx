'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, MessageSquare, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Feedback } from '@/types/feedback';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/types/feedback';
import { getStatusBadgeColor, getCategoryBadgeColor } from '@/components/feedback/utils';
import { cn } from '@/lib/utils';

interface AdminFeedbackCardProps {
  feedback: Feedback;
  onView: (feedback: Feedback) => void;
  onRespond: (feedback: Feedback) => void;
}

/**
 * Card component to display a feedback item in admin list
 */
export function AdminFeedbackCard({ feedback, onView, onRespond }: AdminFeedbackCardProps) {
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
        <div className="space-y-3">
          {/* User Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="font-mono text-xs">{feedback.user_id.slice(0, 8)}...</span>
          </div>

          {/* Description Preview */}
          <p className="text-sm text-muted-foreground line-clamp-3">{truncatedDescription}</p>

          {/* Date */}
          <p className="text-xs text-muted-foreground">
            {format(new Date(feedback.created_at), "dd 'de' MMMM 'de' yyyy", {
              locale: ptBR,
            })}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => onView(feedback)} className="h-8">
            <Eye className="h-4 w-4 mr-1" />
            Ver
          </Button>
          <Button variant="outline" size="sm" onClick={() => onRespond(feedback)} className="h-8">
            <MessageSquare className="h-4 w-4 mr-1" />
            {hasAdminResponse ? 'Atualizar' : 'Responder'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
