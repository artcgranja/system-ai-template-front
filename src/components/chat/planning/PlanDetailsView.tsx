'use client';

import React from 'react';
import { formatValue } from '@/lib/utils/toolResultParser';
import { getStatusLabel } from '@/lib/utils/planningStatus';
import type { PlanningToolResult, PlanStatus } from '@/types/planning';

interface PlanDetailsViewProps {
  plan: PlanningToolResult;
}

/**
 * Component to display complete plan details
 * Shows all fields from get_active_plan result
 */
export function PlanDetailsView({ plan }: PlanDetailsViewProps) {
  // Fields to display in the details view
  const detailFields: Array<{
    key: keyof PlanningToolResult;
    label: string;
    format?: (value: unknown) => string | React.ReactNode;
  }> = [
    { key: 'plan_id', label: 'ID do Plano' },
    { key: 'title', label: 'Título' },
    { key: 'description', label: 'Descrição' },
    {
      key: 'status',
      label: 'Status',
      format: (value) => {
        if (value && typeof value === 'string') {
          return getStatusLabel(value as PlanStatus);
        }
        return '-';
      },
    },
    { key: 'version', label: 'Versão' },
    { key: 'user_feedback', label: 'Feedback do Usuário' },
    {
      key: 'approval_action',
      label: 'Ação de Aprovação',
      format: (value) => {
        if (!value) return '-';
        const action = value as string;
        return action.charAt(0).toUpperCase() + action.slice(1);
      },
    },
    { key: 'parent_plan_id', label: 'ID do Plano Pai' },
    { key: 'related_tool_name', label: 'Ferramenta Relacionada' },
    {
      key: 'created_at',
      label: 'Criado em',
      format: (value) => (value ? formatValue(value) : '-'),
    },
    {
      key: 'updated_at',
      label: 'Atualizado em',
      format: (value) => (value ? formatValue(value) : '-'),
    },
    {
      key: 'approved_at',
      label: 'Aprovado em',
      format: (value) => (value ? formatValue(value) : '-'),
    },
    {
      key: 'executed_at',
      label: 'Executado em',
      format: (value) => (value ? formatValue(value) : '-'),
    },
    { key: 'revisions_count', label: 'Número de Revisões' },
  ];

  const entries = detailFields
    .filter(({ key }) => plan[key] !== undefined && plan[key] !== null)
    .map(({ key, label, format }) => ({
      key: String(key),
      label,
      value: format ? format(plan[key]) : formatValue(plan[key]),
    }));

  if (entries.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Nenhum detalhe disponível
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map(({ key, label, value }) => (
          <div
            key={key}
            className="rounded-lg border border-border/50 bg-muted/20 p-3 hover:bg-muted/30 transition-colors"
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {label}
            </div>
            <div className="text-sm font-medium text-foreground">
              {typeof value === 'string' || typeof value === 'object' ? value : String(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Link to parent plan if exists */}
      {plan.parent_plan_id && (
        <div className="mt-4 p-3 rounded-lg border border-border/50 bg-muted/10">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Plano Relacionado
          </div>
          <div className="text-sm text-foreground">
            Este plano é uma revisão do plano: {plan.parent_plan_id}
          </div>
        </div>
      )}
    </div>
  );
}
