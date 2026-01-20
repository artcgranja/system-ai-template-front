'use client';

import { useState, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FeedbackFormDialog,
  FeedbackCard,
  FeedbackDetailDialog,
  FeedbackFilters,
  FeedbackEmptyState,
} from '@/components/feedback';
import {
  useFeedbacks,
  useCreateFeedback,
  useUpdateFeedback,
  useDeleteFeedback,
} from '@/lib/hooks/useFeedback';
import type { Feedback, FeedbackCategory, FeedbackStatus, CreateFeedbackInput } from '@/types/feedback';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Feedback page component
 * Allows users to create, view, edit, and delete their feedbacks
 */
export default function FeedbackPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState<Feedback | null>(null);

  // Build filters object
  const filters = {
    page,
    page_size: 20,
    ...(categoryFilter && { category: categoryFilter }),
    ...(statusFilter && { status: statusFilter }),
  };

  // Fetch feedbacks
  const {
    data: feedbacksData,
    isLoading,
    isFetching,
    refetch,
  } = useFeedbacks(filters);

  // Mutations
  const createMutation = useCreateFeedback();
  const updateMutation = useUpdateFeedback();
  const deleteMutation = useDeleteFeedback();

  // Handlers
  const handleCreate = useCallback(
    async (data: CreateFeedbackInput) => {
      try {
        await createMutation.mutateAsync(data);
        setShowCreateDialog(false);
        refetch();
      } catch {
        // Error is already logged by the hook in development mode
      }
    },
    [createMutation, refetch]
  );

  const handleUpdate = useCallback(
    async (data: CreateFeedbackInput) => {
      if (!editingFeedback) return;
      try {
        await updateMutation.mutateAsync({
          feedbackId: editingFeedback.id,
          data,
        });
        setEditingFeedback(null);
        refetch();
      } catch {
        // Error is already logged by the hook in development mode
      }
    },
    [editingFeedback, updateMutation, refetch]
  );

  const handleDelete = useCallback(async () => {
    if (!deletingFeedback) return;
    try {
      await deleteMutation.mutateAsync(deletingFeedback.id);
      setDeletingFeedback(null);
      refetch();
    } catch {
      // Error is already logged by the hook in development mode
    }
  }, [deletingFeedback, deleteMutation, refetch]);

  const handleClearFilters = useCallback(() => {
    setCategoryFilter('');
    setStatusFilter('');
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const feedbacks = feedbacksData?.items || [];
  const total = feedbacksData?.total || 0;
  const totalPages = feedbacksData?.total_pages || 1;

  // Loading skeleton
  if (isLoading && feedbacks.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto max-w-6xl py-8 px-4 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-6xl py-8 px-4 space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Meus Feedbacks</h1>
            <p className="text-muted-foreground mt-1">
              Compartilhe suas sugestões e reporte problemas
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Feedback
          </Button>
        </div>

        {/* Filters */}
        <FeedbackFilters
          category={categoryFilter}
          status={statusFilter}
          onCategoryChange={(cat) => {
            setCategoryFilter(cat);
            setPage(1);
          }}
          onStatusChange={(stat) => {
            setStatusFilter(stat);
            setPage(1);
          }}
          onClear={handleClearFilters}
        />

        {/* Feedback List */}
        {feedbacks.length === 0 ? (
          <FeedbackEmptyState onCreateFeedback={() => setShowCreateDialog(true)} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {feedbacks.map((feedback) => (
                <FeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  onView={setViewingFeedback}
                  onEdit={setEditingFeedback}
                  onDelete={setDeletingFeedback}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Página {page} de {totalPages} • Total: {total} feedbacks
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1 || isFetching}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages || isFetching}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Create Dialog */}
        {showCreateDialog && (
          <FeedbackFormDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSubmit={handleCreate}
            isLoading={createMutation.isPending}
          />
        )}

        {/* Edit Dialog */}
        {editingFeedback && (
          <FeedbackFormDialog
            open={!!editingFeedback}
            onOpenChange={(open) => !open && setEditingFeedback(null)}
            onSubmit={handleUpdate}
            feedback={editingFeedback}
            isLoading={updateMutation.isPending}
          />
        )}

        {/* View Detail Dialog */}
        {viewingFeedback && (
          <FeedbackDetailDialog
            open={!!viewingFeedback}
            onOpenChange={(open) => !open && setViewingFeedback(null)}
            feedback={viewingFeedback}
            onEdit={setEditingFeedback}
            onDelete={setDeletingFeedback}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingFeedback} onOpenChange={(open) => !open && setDeletingFeedback(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este feedback? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletingFeedback(null)}
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  'Excluindo...'
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
