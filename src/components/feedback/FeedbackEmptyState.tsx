'use client';

import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FeedbackEmptyStateProps {
  onCreateFeedback: () => void;
}

/**
 * Empty state component when user has no feedbacks
 */
export function FeedbackEmptyState({ onCreateFeedback }: FeedbackEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <MessageSquarePlus className="h-12 w-12 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Nenhum feedback ainda</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Você ainda não enviou nenhum feedback. Compartilhe suas sugestões, reporte problemas
          ou envie suas ideias para melhorar o aplicativo.
        </p>
        <Button onClick={onCreateFeedback}>
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          Criar Primeiro Feedback
        </Button>
      </CardContent>
    </Card>
  );
}
