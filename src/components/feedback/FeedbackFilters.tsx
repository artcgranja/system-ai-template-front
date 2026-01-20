'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { FeedbackCategory, FeedbackStatus } from '@/types/feedback';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/types/feedback';

interface FeedbackFiltersProps {
  category: FeedbackCategory | '';
  status: FeedbackStatus | '';
  onCategoryChange: (category: FeedbackCategory | '') => void;
  onStatusChange: (status: FeedbackStatus | '') => void;
  onClear: () => void;
}

/**
 * Component for filtering feedbacks by category and status
 */
export function FeedbackFilters({
  category,
  status,
  onCategoryChange,
  onStatusChange,
  onClear,
}: FeedbackFiltersProps) {
  const hasActiveFilters = category !== '' || status !== '';

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Category Filter */}
          <div className="flex-1">
            <label htmlFor="filter-category" className="text-sm font-medium mb-2 block">
              Categoria
            </label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value as FeedbackCategory | '')}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todas as categorias</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <label htmlFor="filter-status" className="text-sm font-medium mb-2 block">
              Status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => onStatusChange(e.target.value as FeedbackStatus | '')}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={onClear}
                className="h-10"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
