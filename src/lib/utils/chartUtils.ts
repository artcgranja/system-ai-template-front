import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Tipos de agrupamento para datas em gráficos
 */
export type ChartGroupBy = 'day' | 'week' | 'month';

/**
 * Formata números grandes para exibição em gráficos
 * Padrão: 1.234.567 → 1.2M, 12.345 → 12.3K
 */
export function formatChartNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

/**
 * Formata datas para labels de eixo X baseado no agrupamento
 * day: "15/01"
 * week: "Sem 3"
 * month: "jan/26"
 */
export function formatChartDate(dateStr: string, grouping: ChartGroupBy = 'day'): string {
  try {
    const date = parseISO(dateStr);
    switch (grouping) {
      case 'day':
        return format(date, 'dd/MM', { locale: ptBR });
      case 'week':
        return format(date, "'Sem' w", { locale: ptBR });
      case 'month':
        return format(date, 'MMM/yy', { locale: ptBR });
      default:
        return format(date, 'dd/MM', { locale: ptBR });
    }
  } catch {
    return dateStr;
  }
}

/**
 * Gera ID único para gradientes SVG evitando conflitos
 * Usa prefixo + timestamp para garantir unicidade
 */
let gradientCounter = 0;
export function generateGradientId(prefix: string): string {
  gradientCounter += 1;
  return `${prefix}-${gradientCounter}`;
}

/**
 * Reseta o contador de gradientes (útil para testes)
 */
export function resetGradientCounter(): void {
  gradientCounter = 0;
}

/**
 * Estilos padrão para Tooltip do Recharts
 * Seguindo padrões shadcn/ui 2026
 */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--background))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
} as const;

/**
 * Estilos padrão para label do Tooltip
 */
export const CHART_TOOLTIP_LABEL_STYLE = {
  color: 'hsl(var(--foreground))',
  fontWeight: 600,
} as const;

/**
 * Estilos padrão para eixos (XAxis/YAxis)
 */
export const CHART_AXIS_STYLE = {
  stroke: 'hsl(var(--muted-foreground))',
  fontSize: '12px',
} as const;

/**
 * Estilos padrão para CartesianGrid
 */
export const CHART_GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--border))',
} as const;

/**
 * Estilos padrão para Legend
 */
export const CHART_LEGEND_STYLE = {
  paddingTop: '20px',
} as const;

/**
 * Margins padrão para gráficos
 */
export const CHART_MARGINS = {
  default: { top: 10, right: 30, left: 20, bottom: 20 },
  withAngledLabels: { top: 10, right: 30, left: 20, bottom: 60 },
} as const;

/**
 * Alturas padrão para gráficos
 */
export const CHART_HEIGHTS = {
  default: 350,
  detailed: 400,
  compact: 250,
} as const;

/**
 * Labels em português para métricas comuns
 */
export const CHART_LABELS: Record<string, string> = {
  normalizedTokens: 'Tokens Normalizados',
  totalTokens: 'Total de Tokens',
  inputTokens: 'Tokens de Entrada',
  outputTokens: 'Tokens de Saída',
  requestCount: 'Requisições',
  uniqueUsers: 'Usuários Únicos',
  tokens: 'Tokens',
};

/**
 * Retorna o label traduzido para uma métrica
 */
export function getChartLabel(key: string): string {
  return CHART_LABELS[key] || key;
}

/**
 * Formata valor para exibição no Tooltip
 * Adiciona unidade quando apropriado
 */
export function formatTooltipValue(value: unknown, key?: string): string {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'number') {
    // Adiciona unidade kWh para consumo
    if (key?.toLowerCase().includes('consumption') || key?.toLowerCase().includes('kwh')) {
      return `${value.toLocaleString('pt-BR')} kWh`;
    }
    return value.toLocaleString('pt-BR');
  }

  return String(value);
}
