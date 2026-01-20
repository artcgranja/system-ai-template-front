/**
 * Utility functions for planning status
 */

import type { PlanStatus } from '@/types/planning';

/**
 * Converts plan status to readable text
 */
export function getStatusLabel(status: PlanStatus): string {
  const statusLabels: Record<PlanStatus, string> = {
    draft: 'Rascunho',
    pending_approval: 'Aguardando Aprovação',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    revised: 'Revisado',
    executed: 'Executado',
  };
  return statusLabels[status] || status;
}
