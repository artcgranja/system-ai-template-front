'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Loader2,
  MessageSquare,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CollapsibleMarkdownPreview } from '@/components/chat/planning/CollapsibleMarkdownPreview';
import type { PlanApprovalInterruptData, PlanApprovalResponse } from '@/types/interrupt';

/**
 * Normalize markdown by converting escaped newlines to actual newlines
 * This handles cases where the backend sends \\n instead of \n
 */
function normalizeMarkdown(markdown: string): string {
  return markdown
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');
}

interface PlanApprovalCardProps {
  data: PlanApprovalInterruptData;
  onSubmit: (response: PlanApprovalResponse) => void;
  isSubmitting: boolean;
}

/**
 * Card component for displaying plan approval in the input area
 * Shows the plan markdown with approve/comment/reject actions
 * - approve: Approves the plan (feedback optional)
 * - comment: Requests revision (feedback REQUIRED)
 * - reject: Cancels the plan (feedback optional)
 */
export function PlanApprovalCard({
  data,
  onSubmit,
  isSubmitting,
}: PlanApprovalCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showFeedback && feedbackRef.current) {
      feedbackRef.current.focus();
    }
  }, [showFeedback]);

  // Clear error when feedback changes
  useEffect(() => {
    if (feedback.trim() && feedbackError) {
      setFeedbackError(null);
    }
  }, [feedback, feedbackError]);

  const handleApprove = useCallback(() => {
    onSubmit({
      action: 'approve',
      feedback: feedback.trim() || undefined,
    });
  }, [onSubmit, feedback]);

  const handleComment = useCallback(() => {
    // If feedback is not shown, show it first
    if (!showFeedback) {
      setShowFeedback(true);
      return;
    }

    // Validate feedback is provided for comment action
    if (!feedback.trim()) {
      setFeedbackError('Por favor, descreva as alteracoes desejadas');
      feedbackRef.current?.focus();
      return;
    }

    onSubmit({
      action: 'comment',
      feedback: feedback.trim(),
    });
  }, [onSubmit, feedback, showFeedback]);

  const handleReject = useCallback(() => {
    onSubmit({
      action: 'reject',
      feedback: feedback.trim() || undefined,
    });
  }, [onSubmit, feedback]);

  const toggleFeedback = useCallback(() => {
    setShowFeedback((prev) => !prev);
    if (showFeedback) {
      setFeedback('');
      setFeedbackError(null);
    }
  }, [showFeedback]);

  // Normalize markdown to handle escaped newlines from backend
  const normalizedMarkdown = useMemo(
    () => normalizeMarkdown(data.markdown),
    [data.markdown]
  );

  return (
    <div className="w-full flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {/* Plan Header */}
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Plano v{data.version}
          </span>
        </div>

        {/* Plan Content - Using CollapsibleMarkdownPreview for consistent UX */}
        <CollapsibleMarkdownPreview markdown={normalizedMarkdown} />

        {/* Message from assistant */}
        <p className="text-sm text-muted-foreground">{data.message}</p>
      </div>

      {/* Fixed bottom section */}
      <div className="flex-shrink-0 pt-4 space-y-4">
        {/* Feedback Section */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-2"
            >
              <Textarea
                ref={feedbackRef}
                placeholder="Descreva as alteracoes desejadas no plano..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                disabled={isSubmitting}
                className={cn(
                  'min-h-[80px] bg-background resize-none',
                  feedbackError && 'border-destructive focus-visible:ring-destructive'
                )}
              />
              {feedbackError && (
                <p className="text-sm text-destructive">{feedbackError}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFeedback}
          disabled={isSubmitting}
          className="gap-1 text-muted-foreground"
        >
          <MessageSquare className="h-4 w-4" />
          {showFeedback ? 'Esconder comentario' : 'Adicionar comentario'}
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReject}
            disabled={isSubmitting}
            className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Cancelar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleComment}
            disabled={isSubmitting}
            className="gap-1 text-amber-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Solicitar Alteracoes
          </Button>

          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isSubmitting}
            className="gap-1"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Aprovar
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}
