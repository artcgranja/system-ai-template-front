'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Feedback, FeedbackStatus } from '@/types/feedback';
import { STATUS_LABELS } from '@/types/feedback';
import type { UpdateAdminFeedbackInput } from '@/types/feedback';

interface AdminFeedbackResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: Feedback | null;
  onSubmit: (data: UpdateAdminFeedbackInput) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Dialog component for admin to respond and update feedback status
 */
export function AdminFeedbackResponseDialog({
  open,
  onOpenChange,
  feedback,
  onSubmit,
  isLoading = false,
}: AdminFeedbackResponseDialogProps) {
  const [status, setStatus] = useState<FeedbackStatus>('pending');
  const [adminResponse, setAdminResponse] = useState('');
  const [errors, setErrors] = useState<{ adminResponse?: string }>({});

  // Initialize form with feedback data
  useEffect(() => {
    if (feedback) {
      setStatus(feedback.status);
      setAdminResponse(feedback.admin_response || '');
      setErrors({});
    } else {
      setStatus('pending');
      setAdminResponse('');
      setErrors({});
    }
  }, [feedback, open]);

  const handleSubmit = async () => {
    // Validate admin response length if provided
    if (adminResponse.trim() && adminResponse.length > 5000) {
      setErrors({ adminResponse: 'Resposta deve ter no máximo 5000 caracteres' });
      return;
    }

    const data: UpdateAdminFeedbackInput = {
      status,
      ...(adminResponse.trim() && { admin_response: adminResponse.trim() }),
    };

    await onSubmit(data);
    
    // Reset form on success
    if (feedback) {
      setAdminResponse(feedback.admin_response || '');
    } else {
      setAdminResponse('');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  if (!feedback) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Responder / Atualizar Feedback</DialogTitle>
          <DialogDescription>
            Atualize o status e adicione uma resposta para este feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Field */}
          <div className="space-y-2">
            <label htmlFor="admin-status" className="text-sm font-medium">
              Status <span className="text-destructive">*</span>
            </label>
            <select
              id="admin-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as FeedbackStatus)}
              disabled={isLoading}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Admin Response Field */}
          <div className="space-y-2">
            <label htmlFor="admin-response" className="text-sm font-medium">
              Resposta do Administrador <span className="text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              id="admin-response"
              value={adminResponse}
              onChange={(e) => {
                setAdminResponse(e.target.value);
                if (errors.adminResponse) {
                  setErrors((prev) => ({ ...prev, adminResponse: undefined }));
                }
              }}
              placeholder="Digite sua resposta para o usuário..."
              rows={6}
              maxLength={5000}
              disabled={isLoading}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              {errors.adminResponse && (
                <p className="text-sm text-destructive">{errors.adminResponse}</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {adminResponse.length}/5000
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendamos adicionar uma resposta ao atualizar o status do feedback.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
