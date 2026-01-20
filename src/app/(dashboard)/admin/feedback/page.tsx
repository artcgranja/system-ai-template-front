'use client';

import { useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AdminFeedbackCard,
  AdminFeedbackDetailDialog,
  AdminFeedbackResponseDialog,
  AdminFeedbackFilters,
} from '@/components/admin/feedback';
import { useAdminFeedbacks } from '@/lib/hooks/useAdmin';
import type { Feedback, FeedbackCategory, FeedbackStatus, UpdateAdminFeedbackInput } from '@/types/feedback';

/**
 * Admin feedback management page
 * Allows admins to view, filter, and respond to all user feedbacks
 */
export default function AdminFeedbackPage() {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | ''>('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [viewingFeedback, setViewingFeedback] = useState<Feedback | null>(null);
  const [respondingFeedback, setRespondingFeedback] = useState<Feedback | null>(null);

  // Build filters object
  const filters = {
    page,
    page_size: 20,
    ...(categoryFilter && { category: categoryFilter }),
    ...(statusFilter && { status: statusFilter }),
    ...(userIdFilter.trim() && { user_id: userIdFilter.trim() }),
  };

  // Fetch feedbacks
  const {
    feedbacks,
    total,
    page: currentPage,
    totalPages,
    isLoading,
    isFetching,
    updateFeedback,
    isUpdating,
    refetch,
    resetParams,
  } = useAdminFeedbacks(filters);

  // Calculate statistics
  const stats = useMemo(() => {
    const pending = feedbacks.filter((f) => f.status === 'pending').length;
    const inReview = feedbacks.filter((f) => f.status === 'in_review').length;
    const resolved = feedbacks.filter((f) => f.status === 'resolved').length;
    return { pending, inReview, resolved };
  }, [feedbacks]);

  // Handlers
  const handleUpdate = useCallback(
    async (data: UpdateAdminFeedbackInput) => {
      if (!respondingFeedback) return;
      try {
        await updateFeedback(respondingFeedback.id, data);
        setRespondingFeedback(null);
        refetch();
      } catch {
        // Error is already logged by the hook in development mode
      }
    },
    [respondingFeedback, updateFeedback, refetch]
  );

  const handleClearFilters = useCallback(() => {
    setCategoryFilter('');
    setStatusFilter('');
    setUserIdFilter('');
    setPage(1);
    resetParams();
  }, [resetParams]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Loading skeleton
  if (isLoading && feedbacks.length === 0) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Feedbacks</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os feedbacks do sistema
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-sm text-muted-foreground">Total de Feedbacks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.inReview}</div>
            <p className="text-sm text-muted-foreground">Em Análise</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.resolved}</div>
            <p className="text-sm text-muted-foreground">Resolvidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <AdminFeedbackFilters
        category={categoryFilter}
        status={statusFilter}
        userId={userIdFilter}
        onCategoryChange={(cat) => {
          setCategoryFilter(cat);
          setPage(1);
        }}
        onStatusChange={(stat) => {
          setStatusFilter(stat);
          setPage(1);
        }}
        onUserIdChange={(id) => {
          setUserIdFilter(id);
          setPage(1);
        }}
        onClear={handleClearFilters}
      />

      {/* Feedback List */}
      {feedbacks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Nenhum feedback encontrado com os filtros aplicados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>
            <div className="grid gap-4 md:grid-cols-2">
              {feedbacks.map((feedback) => (
                <AdminFeedbackCard
                  key={feedback.id}
                  feedback={feedback}
                  onView={setViewingFeedback}
                  onRespond={setRespondingFeedback}
                />
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} • Total: {total} feedbacks
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || isFetching}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || isFetching}
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

      {/* View Detail Dialog */}
      {viewingFeedback && (
        <AdminFeedbackDetailDialog
          open={!!viewingFeedback}
          onOpenChange={(open) => !open && setViewingFeedback(null)}
          feedback={viewingFeedback}
          onRespond={setRespondingFeedback}
        />
      )}

      {/* Respond/Update Dialog */}
      {respondingFeedback && (
        <AdminFeedbackResponseDialog
          open={!!respondingFeedback}
          onOpenChange={(open) => !open && setRespondingFeedback(null)}
          feedback={respondingFeedback}
          onSubmit={handleUpdate}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
}
