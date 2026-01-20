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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  Feedback,
  CreateFeedbackInput,
  FeedbackCategory,
} from '@/types/feedback';
import { CATEGORY_LABELS } from '@/types/feedback';

interface FeedbackFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateFeedbackInput) => Promise<void>;
  feedback?: Feedback | null;
  isLoading?: boolean;
}

/**
 * Dialog component for creating or editing feedback
 * Includes validation and character counters
 */
export function FeedbackFormDialog({
  open,
  onOpenChange,
  onSubmit,
  feedback,
  isLoading = false,
}: FeedbackFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeedbackCategory | ''>('');
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    category?: string;
  }>({});

  // Initialize form with feedback data when editing
  useEffect(() => {
    if (feedback) {
      setTitle(feedback.title);
      setDescription(feedback.description);
      setCategory(feedback.category);
    } else {
      // Reset form for new feedback
      setTitle('');
      setDescription('');
      setCategory('');
      setErrors({});
    }
  }, [feedback, open]);

  // Validate form fields
  const validate = (): boolean => {
    const newErrors: { title?: string; description?: string; category?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Título é obrigatório';
    } else if (title.length < 3) {
      newErrors.title = 'Título deve ter pelo menos 3 caracteres';
    } else if (title.length > 200) {
      newErrors.title = 'Título deve ter no máximo 200 caracteres';
    }

    if (!category) {
      newErrors.category = 'Categoria é obrigatória';
    }

    if (!description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    } else if (description.length < 10) {
      newErrors.description = 'Descrição deve ter pelo menos 10 caracteres';
    } else if (description.length > 5000) {
      newErrors.description = 'Descrição deve ter no máximo 5000 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if form is valid for button state
  const isFormValid = (): boolean => {
    return (
      title.trim().length >= 3 &&
      title.trim().length <= 200 &&
      description.trim().length >= 10 &&
      description.trim().length <= 5000 &&
      category !== ''
    );
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    if (!category) {
      setErrors((prev) => ({ ...prev, category: 'Categoria é obrigatória' }));
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim(),
      category: category as FeedbackCategory,
    };

    await onSubmit(data);
    
    // Reset form on success
    if (!feedback) {
      setTitle('');
      setDescription('');
      setCategory('');
      setErrors({});
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  const isEditMode = !!feedback;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Editar Feedback' : 'Novo Feedback'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Atualize as informações do seu feedback.'
              : 'Compartilhe suas sugestões, reporte problemas ou envie feedback sobre o aplicativo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title Field */}
          <div className="space-y-2">
            <label htmlFor="feedback-title" className="text-sm font-medium">
              Título <span className="text-destructive">*</span>
            </label>
            <Input
              id="feedback-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) {
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              placeholder="Ex: Adicionar modo escuro"
              maxLength={200}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {title.length}/200
              </p>
            </div>
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <label htmlFor="feedback-category" className="text-sm font-medium">
              Categoria <span className="text-destructive">*</span>
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as FeedbackCategory | '');
                if (errors.category) {
                  setErrors((prev) => ({ ...prev, category: undefined }));
                }
              }}
              disabled={isLoading}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecione uma categoria</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <label htmlFor="feedback-description" className="text-sm font-medium">
              Descrição <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="feedback-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              placeholder="Descreva seu feedback em detalhes..."
              rows={6}
              maxLength={5000}
              disabled={isLoading}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">
                {description.length}/5000
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !isFormValid()}>
            {isLoading
              ? 'Salvando...'
              : isEditMode
              ? 'Salvar Alterações'
              : 'Enviar Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
