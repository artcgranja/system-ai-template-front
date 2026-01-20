'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, MessageSquare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PlanStatus, ApprovalAction } from '@/types/planning';

interface PlanApprovalActionsProps {
  planId: string;
  currentStatus: PlanStatus;
  currentMarkdown?: string;
  onApprove: (planId: string, feedback?: string) => Promise<void> | void;
  onReject: (planId: string, feedback?: string) => Promise<void> | void;
  onComment: (planId: string, feedback: string, updatedMarkdown?: string) => Promise<void> | void;
  disabled?: boolean;
}

/**
 * Component for plan approval actions (approve, reject, comment)
 * Provides interactive buttons and dialog for user feedback
 */
export function PlanApprovalActions({
  planId,
  currentStatus,
  currentMarkdown,
  onApprove,
  onReject,
  onComment,
  disabled = false,
}: PlanApprovalActionsProps) {
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [requestMarkdownChanges, setRequestMarkdownChanges] = useState(false);
  const [updatedMarkdown, setUpdatedMarkdown] = useState(currentMarkdown || '');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<ApprovalAction | null>(null);

  const canApproveOrReject = currentStatus === 'pending_approval';

  const handleApprove = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    setLoadingAction('approved');
    try {
      await onApprove(planId);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleReject = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    setLoadingAction('rejected');
    try {
      await onReject(planId);
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleCommentSubmit = async () => {
    if (disabled || isLoading || !feedback.trim()) return;
    
    setIsLoading(true);
    setLoadingAction('commented');
    try {
      // If user requested markdown changes and provided updated markdown, include it
      const markdownToSend = requestMarkdownChanges && updatedMarkdown.trim() 
        ? updatedMarkdown.trim() 
        : undefined;
      
      await onComment(planId, feedback.trim(), markdownToSend);
      setIsCommentDialogOpen(false);
      setFeedback('');
      setRequestMarkdownChanges(false);
      setUpdatedMarkdown(currentMarkdown || '');
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsCommentDialogOpen(false);
      setFeedback('');
      setRequestMarkdownChanges(false);
      setUpdatedMarkdown(currentMarkdown || '');
    } else {
      setIsCommentDialogOpen(true);
      // Reset markdown to current when opening
      setUpdatedMarkdown(currentMarkdown || '');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {canApproveOrReject && (
          <>
            <Button
              onClick={handleApprove}
              disabled={disabled || isLoading}
              variant="default"
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loadingAction === 'approved' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprovar
                </>
              )}
            </Button>
            <Button
              onClick={handleReject}
              disabled={disabled || isLoading}
              variant="destructive"
              size="sm"
            >
              {loadingAction === 'rejected' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejeitando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </>
              )}
            </Button>
          </>
        )}
        <Button
          onClick={() => setIsCommentDialogOpen(true)}
          disabled={disabled || isLoading}
          variant="outline"
          size="sm"
          className="border-blue-500/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Comentar
        </Button>
      </div>

      {/* Comment Dialog */}
      <Dialog open={isCommentDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Comentar sobre o Plano</DialogTitle>
            <DialogDescription>
              Adicione comentários ou solicite mudanças no plano {planId}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div>
                <label htmlFor="feedback" className="text-sm font-medium mb-2 block">
                  Comentário
                </label>
                <Textarea
                  id="feedback"
                  placeholder="Digite seus comentários ou mudanças solicitadas..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  disabled={isLoading}
                  className="resize-none"
                />
              </div>

              {/* Checkbox to request markdown changes */}
              {currentMarkdown && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="request-markdown-changes"
                    checked={requestMarkdownChanges}
                    onCheckedChange={(checked) => {
                      setRequestMarkdownChanges(checked === true);
                      if (checked) {
                        setUpdatedMarkdown(currentMarkdown);
                      }
                    }}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="request-markdown-changes"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Solicitar mudanças no markdown
                  </label>
                </div>
              )}

              {/* Markdown editor (shown when checkbox is checked) */}
              {requestMarkdownChanges && currentMarkdown && (
                <div className="space-y-2">
                  <label htmlFor="updated-markdown" className="text-sm font-medium block">
                    Markdown Atualizado
                  </label>
                  <Textarea
                    id="updated-markdown"
                    placeholder="Edite o markdown do plano aqui..."
                    value={updatedMarkdown}
                    onChange={(e) => setUpdatedMarkdown(e.target.value)}
                    disabled={isLoading}
                    className="resize-none font-mono text-sm min-h-[400px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Edite o markdown completo do plano. As alterações serão enviadas ao agent para processamento.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogClose(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCommentSubmit}
              disabled={isLoading || !feedback.trim() || (requestMarkdownChanges && !updatedMarkdown.trim())}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Comentário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
