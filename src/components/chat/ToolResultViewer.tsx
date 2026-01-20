'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Code2, Table2, BarChart3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Maximize2, Download, Presentation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CodeBlock } from './CodeBlock';
import { ConsumptionHistoryChart } from './ConsumptionHistoryChart';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load ChartViewer - heavy component with Recharts (~80KB)
const ChartViewer = dynamic(
  () => import('./ChartViewer').then(mod => ({ default: mod.ChartViewer })),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false,
  }
);
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  parseToolResult,
  isArrayOfObjects,
  formatKeyName,
  formatValue,
} from '@/lib/utils/toolResultParser';
import {
  hasSpecificParser,
  extractConsumptionHistory,
  getConsumptionHistoryMetadata,
  type ConsumptionHistoryData,
} from '@/lib/utils/toolSpecificParsers';
import { isPlanningTool, parsePlanningToolResult } from '@/lib/utils/planningTools';
import { PlanningToolCard } from './planning/PlanningToolCard';
import type { PlanningToolResult, PlanStatus } from '@/types/planning';
import { exportToXlsx } from '@/lib/utils/xlsxExporter';

// Configurações de paginação e limites
const ROWS_PER_PAGE = 50;
const MAX_JSON_LINES = 100;

/**
 * Componente para visualização de JSON grande com truncamento e modal
 */
function LargeJsonViewer({ jsonString, language = 'json' }: { jsonString: string; language?: string }) {
  const lines = jsonString.split('\n');
  const isLarge = lines.length > MAX_JSON_LINES;
  const truncatedJson = isLarge ? lines.slice(0, MAX_JSON_LINES).join('\n') : jsonString;
  const hiddenLines = lines.length - MAX_JSON_LINES;

  if (!isLarge) {
    return <CodeBlock language={language} code={jsonString} />;
  }

  return (
    <div className="relative">
      <CodeBlock language={language} code={truncatedJson + '\n\n// ...'} />

      {/* Overlay com informação e botão para ver completo */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background/95 to-transparent pt-12 pb-4 px-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Mostrando {MAX_JSON_LINES} de {lines.length} linhas ({hiddenLines} linhas ocultas)
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Maximize2 className="h-3.5 w-3.5" />
                Ver JSON completo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>JSON Completo ({lines.length} linhas)</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto min-h-0">
                <pre className="text-xs font-mono p-4 bg-muted/30 rounded-lg whitespace-pre-wrap break-words">
                  {jsonString}
                </pre>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

interface ToolResultViewerProps {
  result: string;
  isError?: boolean;
  toolName?: string;
  isStreaming?: boolean;
}

export function ToolResultViewer({ result, isError, toolName, isStreaming }: ToolResultViewerProps) {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  // Check if the result is an interrupt status message (not actual tool output)
  // These messages are set when a LangGraph interrupt is triggered
  // The actual content is shown in the InterruptCard, so we hide this to avoid noise
  const interruptStatusMessages = [
    'Aguardando aprovacao do plano...',
    'Aguardando resposta do usuario...',
  ];
  if (interruptStatusMessages.some(msg => result.trim() === msg)) {
    return null;
  }

  // Parse result for non-streaming use cases (needed by hasSpecificParser and other generic viewers)
  const parsed = parseToolResult(result);

  // Check if this is a planning tool first (before generic parsers)
  if (toolName && isPlanningTool(toolName) && !isError) {
    // During streaming, try to extract markdown from raw content
    if (isStreaming && result) {
      // Try multiple strategies to extract markdown from streaming content
      let streamingMarkdown = '';
      
      // Strategy 1: Try to parse as JSON and extract markdown field
      try {
        const parsed = JSON.parse(result);
        if (parsed.markdown && typeof parsed.markdown === 'string') {
          streamingMarkdown = parsed.markdown;
        }
      } catch {
        // Not valid JSON yet, try regex extraction
        // Strategy 2: Try to find markdown field in partial JSON (handles escaped strings)
        // Match: "markdown": "content" - handles both single-line and multi-line
        const jsonMarkdownMatch = result.match(/"markdown"\s*:\s*"((?:[^"\\]|\\.|\\n)*)"/);
        if (jsonMarkdownMatch) {
          // Unescape JSON string
          streamingMarkdown = jsonMarkdownMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        } else {
          // Strategy 3: Try to find markdown field with unclosed string (streaming)
          // Match: "markdown": "content... (string not closed yet)
          const streamingMatch = result.match(/"markdown"\s*:\s*"([\s\S]*)$/);
          if (streamingMatch) {
            streamingMarkdown = streamingMatch[1]
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          } else {
            // Strategy 4: Check if content looks like raw markdown
            // (starts with # heading, contains markdown patterns, or is mostly text)
            const trimmed = result.trim();
            if (
              trimmed.startsWith('#') ||
              trimmed.includes('\n#') ||
              trimmed.includes('```') ||
              (trimmed.length > 50 && !trimmed.startsWith('{') && !trimmed.startsWith('['))
            ) {
              streamingMarkdown = result;
            }
          }
        }
      }
      
      // If we found markdown, render it immediately with streaming mode
      if (streamingMarkdown) {
        return (
          <PlanningToolCard
            toolName={toolName}
            result={{
              success: true,
              message: 'Gerando plano...',
              markdown: streamingMarkdown,
            }}
            isStreaming={true}
          />
        );
      }
      
      // If no markdown found but we have content, show it as-is (might be partial JSON)
      if (result.length > 0) {
        return (
          <div className="p-4 text-sm text-muted-foreground">
            <div className="animate-pulse">Gerando plano...</div>
          </div>
        );
      }
    }

    // First, try to detect planning tool structure from already parsed result
    // This handles cases where the result is already a parsed object
    if (parsed.type === 'object') {
      const obj = parsed.data as Record<string, unknown>;
      
      // Normalize object keys to lowercase to handle cases like "SUCCESS", "PLAN_ID", "MARKDOWN"
      const normalizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        normalizedObj[key.toLowerCase()] = value;
      }
      
      // Normalize success field - handle both boolean and string ("Sim"/"Não")
      let success: boolean | undefined;
      const successValue = normalizedObj.success;
      if (typeof successValue === 'boolean') {
        success = successValue;
      } else if (typeof successValue === 'string') {
        success = successValue.toLowerCase() === 'sim' || successValue.toLowerCase() === 'true' || successValue === '1';
      }
      
      // Check if it looks like a planning tool result
      // Look for success field (boolean or string) AND message field AND at least one planning-specific field
      const message = normalizedObj.message;
      const planId = normalizedObj.plan_id || normalizedObj.planid;
      const status = normalizedObj.status;
      const markdown = normalizedObj.markdown;
      const gammaResult = normalizedObj.gamma_result;

      if (success !== undefined && typeof message === 'string' && (planId !== undefined || status !== undefined || markdown !== undefined || gammaResult !== undefined)) {
        try {
          // Construct a PlanningToolResult from the parsed object
          const planningResult: PlanningToolResult = {
            success: success,
            message: message as string,
            plan_id: planId as string | undefined,
            markdown: markdown as string | undefined,
            status: status as PlanStatus | undefined,
            version: normalizedObj.version as number | undefined,
            error: normalizedObj.error as string | undefined,
            revision_id: normalizedObj.revision_id as string | undefined,
            gamma_result: gammaResult as PlanningToolResult['gamma_result'],
          };
          return (
            <PlanningToolCard
              toolName={toolName}
              result={planningResult}
              isStreaming={isStreaming}
            />
          );
        } catch (fallbackError) {
          console.error('Failed to create planning result from parsed object:', fallbackError);
        }
      }
    }

    // If direct parsing didn't work, try parsePlanningToolResult
    try {
      const planningResult = parsePlanningToolResult(result);
      // Only render planning card if parsing was successful
      // Check for success field (boolean) or if we have required planning tool fields
      if (planningResult.success !== undefined || (planningResult.message && (planningResult.plan_id || planningResult.status))) {
        return (
          <PlanningToolCard
            toolName={toolName}
            result={planningResult}
            isStreaming={isStreaming}
          />
        );
      }
    } catch (error) {
      console.error('Failed to parse planning tool result:', error, 'Result:', result);
      // Fall through to generic error handling
    }
  }

  // Check if this tool has a specific parser
  const hasSpecific = toolName ? hasSpecificParser(toolName, parsed) : false;

  // If error or invalid, show raw result
  if (isError || parsed.type === 'invalid') {
    return (
      <pre
        className={cn(
          'text-xs p-2 rounded overflow-x-auto whitespace-pre-wrap break-words',
          isError
            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
            : 'bg-muted/50 text-foreground/80'
        )}
      >
        <code>{result}</code>
      </pre>
    );
  }

  // Toggle button for switching between formatted and raw view
  const ToggleButton = () => (
    <div className="flex items-center gap-2 mb-2">
      <button
        onClick={() => setViewMode(viewMode === 'formatted' ? 'raw' : 'formatted')}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
          'hover:bg-muted/70',
          viewMode === 'formatted'
            ? 'bg-primary/10 text-primary'
            : 'bg-muted/50 text-muted-foreground'
        )}
      >
        {viewMode === 'formatted' ? (
          <>
            <Code2 className="h-3 w-3" />
            Ver JSON
          </>
        ) : (
          <>
            <Table2 className="h-3 w-3" />
            Ver Formatado
          </>
        )}
      </button>
    </div>
  );

  // Show raw JSON view
  if (viewMode === 'raw') {
    const jsonString = JSON.stringify(
      parsed.type === 'array' ? parsed.data : parsed.type === 'object' ? parsed.data : parsed.data,
      null,
      2
    );
    return (
      <div>
        <ToggleButton />
        <LargeJsonViewer jsonString={jsonString} />
      </div>
    );
  }

  // Handle specific parsers
  if (hasSpecific && toolName === 'get_client_history') {
    const consumptionData = extractConsumptionHistory(parsed);
    const metadata = getConsumptionHistoryMetadata(parsed);

    if (consumptionData) {
      return (
        <SpecificToolViewer
          consumptionData={consumptionData}
          metadata={metadata}
          ToggleButton={ToggleButton}
        />
      );
    }
  }

  // Render based on parsed type (generic parser)
  if (parsed.type === 'array' && isArrayOfObjects(parsed.data)) {
    return <ArrayTableViewer data={parsed.data} ToggleButton={ToggleButton} />;
  }

  if (parsed.type === 'object') {
    const keys = Object.keys(parsed.data);
    
    // Check if object contains an array of objects (like history field)
    const arrayKey = keys.find(key => {
      const value = parsed.data[key];
      return Array.isArray(value) && isArrayOfObjects(value);
    });

    if (arrayKey) {
      // Show the array as table and other fields as metadata
      const arrayData = parsed.data[arrayKey] as Record<string, unknown>[];
      // Fields to hide from metadata display
      const hiddenFields = [arrayKey, 'resumo_periodo'];
      const metadata = Object.fromEntries(
        Object.entries(parsed.data).filter(([key]) => !hiddenFields.includes(key))
      );
      return (
        <ObjectWithArrayViewer
          arrayKey={arrayKey}
          arrayData={arrayData}
          metadata={metadata}
          ToggleButton={ToggleButton}
        />
      );
    }

    // Check if it's a simple key-value object (like list_clients)
    const hasSimpleValues = keys.every(
      key =>
        parsed.data[key] === null ||
        typeof parsed.data[key] === 'string' ||
        typeof parsed.data[key] === 'number' ||
        typeof parsed.data[key] === 'boolean'
    );

    if (hasSimpleValues && keys.length > 0) {
      return <SimpleObjectViewer data={parsed.data} ToggleButton={ToggleButton} />;
    }

    // Complex object - show as formatted JSON
    const jsonString = JSON.stringify(parsed.data, null, 2);
    return (
      <div>
        <ToggleButton />
        <LargeJsonViewer jsonString={jsonString} />
      </div>
    );
  }

  // Primitive or other types - show as formatted JSON
  const jsonString = JSON.stringify(parsed.data, null, 2);
  return (
    <div>
      <ToggleButton />
      <LargeJsonViewer jsonString={jsonString} />
    </div>
  );
}

/**
 * Renders a specific tool viewer (like consumption history)
 */
function SpecificToolViewer({
  consumptionData,
  metadata,
  ToggleButton,
}: {
  consumptionData: ConsumptionHistoryData[];
  metadata: Record<string, unknown>;
  ToggleButton: () => React.ReactElement;
}) {
  const [viewType, setViewType] = useState<'table' | 'chart'>('chart');

  return (
    <div>
      <ToggleButton />

      {/* Show metadata fields if any */}
      {Object.keys(metadata).length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(metadata).map(([key, value]) => (
            <div
              key={key}
              className="rounded-lg border border-border/50 bg-muted/20 p-3"
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {formatKeyName(key)}
              </div>
              <div className="text-sm font-medium text-foreground">
                {formatValue(value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View type toggle and export button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewType('table')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
              viewType === 'table'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
            )}
          >
            <Table2 className="h-3 w-3" />
            Tabela
          </button>
          <button
            onClick={() => setViewType('chart')}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
              viewType === 'chart'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
            )}
          >
            <BarChart3 className="h-3 w-3" />
            Gráfico
          </button>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToXlsx(consumptionData as unknown as Record<string, unknown>[], 'historico-consumo')}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground"
            title="Exportar dados para Excel"
          >
            <Download className="h-3 w-3" />
            Exportar XLSX
          </button>
          {viewType === 'chart' && (
            <button
              onClick={async () => {
                // Find chart element within the consumption chart container
                const chartContainer = document.querySelector('[data-consumption-chart]') as HTMLElement;
                const chartElement = chartContainer?.querySelector('.recharts-wrapper') as HTMLElement;
                if (chartElement) {
                  const { exportChartToPptx } = await import('@/lib/utils/pptxExporter');
                  try {
                    await exportChartToPptx({
                      chartElement,
                      title: 'Histórico de Consumo',
                      filename: 'historico-consumo',
                      notes: `${consumptionData.length} ${consumptionData.length === 1 ? 'registro' : 'registros'} de consumo`,
                    });
                  } catch (error) {
                    console.error('Erro ao exportar:', error);
                    alert('Erro ao exportar gráfico. Tente novamente.');
                  }
                }
              }}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground"
              title="Exportar gráfico para PowerPoint"
            >
              <Presentation className="h-3 w-3" />
              Exportar PPT
            </button>
          )}
        </div>
      </div>

      {/* Render based on view type */}
      {viewType === 'table' ? (
        <ArrayTableViewer data={consumptionData as unknown as Record<string, unknown>[]} hideToggle />
      ) : (
        <ConsumptionHistoryChart data={consumptionData} />
      )}
    </div>
  );
}

/**
 * Componente de paginação reutilizável
 */
function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border/50">
      <span className="text-xs text-muted-foreground">
        {startItem}-{endItem} de {totalItems} registros
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-7 w-7 p-0"
          title="Primeira página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-7 w-7 p-0"
          title="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs text-muted-foreground px-2 min-w-[80px] text-center">
          Página {currentPage} de {totalPages}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 p-0"
          title="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="h-7 w-7 p-0"
          title="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders an array of objects as a formatted table or chart
 */
function ArrayTableViewer({
  data,
  ToggleButton,
  hideToggle = false,
}: {
  data: Record<string, unknown>[];
  ToggleButton?: () => React.ReactElement;
  hideToggle?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);

  // Calcular paginação
  const totalPages = Math.ceil(data.length / ROWS_PER_PAGE);
  const needsPagination = data.length > ROWS_PER_PAGE;

  const paginatedData = useMemo(() => {
    if (!needsPagination) return data;
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return data.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [data, currentPage, needsPagination]);

  // Get all unique keys from all objects
  const allKeys = useMemo(() => {
    return Array.from(
      new Set(data.flatMap(obj => Object.keys(obj)))
    ).filter(key => {
      // Filter out keys that are objects or arrays (show as [Object] or [Array])
      const sampleValue = data.find(obj => obj[key] !== undefined)?.[key];
      return sampleValue === null ||
             typeof sampleValue === 'string' ||
             typeof sampleValue === 'number' ||
             typeof sampleValue === 'boolean' ||
             (typeof sampleValue === 'object' && !Array.isArray(sampleValue));
    });
  }, [data]);

  // Check if data has numeric columns for chart
  const hasNumericColumns = useMemo(() => {
    return allKeys.some(key => {
      // Exclude ID columns
      if (key.toLowerCase().includes('id')) return false;
      const sampleValue = data.find(obj => obj[key] !== undefined)?.[key];
      return typeof sampleValue === 'number' && !isNaN(sampleValue);
    });
  }, [allKeys, data]);

  // Initialize viewType as 'chart' if has numeric columns, otherwise 'table'
  const [viewType, setViewType] = useState<'table' | 'chart'>(() => 
    hasNumericColumns ? 'chart' : 'table'
  );

  if (data.length === 0) {
    return (
      <div>
        {ToggleButton && <ToggleButton />}
        <div className="text-sm text-muted-foreground py-4 text-center">
          Nenhum dado encontrado
        </div>
      </div>
    );
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
      {ToggleButton && <ToggleButton />}

      {/* View type toggle and export button */}
      <div className="flex items-center justify-between mb-3">
        {/* View toggles - only show if not hidden and has numeric columns */}
        {!hideToggle && hasNumericColumns ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewType('table')}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
                viewType === 'table'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
              )}
            >
              <Table2 className="h-3 w-3" />
              Tabela
            </button>
            <button
              onClick={() => setViewType('chart')}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors',
                viewType === 'chart'
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70'
              )}
            >
              <BarChart3 className="h-3 w-3" />
              Gráfico
            </button>
          </div>
        ) : (
          <div />
        )}

        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToXlsx(data, 'dados-exportados')}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground"
            title="Exportar dados para Excel"
          >
            <Download className="h-3 w-3" />
            Exportar XLSX
          </button>
          {viewType === 'chart' && (
            <button
              onClick={async () => {
                // Find chart element within the chart viewer container
                const chartContainer = document.querySelector('[data-chart-viewer]') as HTMLElement;
                const chartElement = chartContainer?.querySelector('.recharts-wrapper') as HTMLElement;
                if (chartElement) {
                  const { exportChartToPptx } = await import('@/lib/utils/pptxExporter');
                  try {
                    await exportChartToPptx({
                      chartElement,
                      title: 'Gráfico de Dados',
                      filename: 'grafico-exportado',
                    });
                  } catch (error) {
                    console.error('Erro ao exportar:', error);
                    alert('Erro ao exportar gráfico. Tente novamente.');
                  }
                }
              }}
              className="flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors bg-muted/50 text-muted-foreground border border-border/50 hover:bg-muted/70 hover:text-foreground"
              title="Exportar gráfico para PowerPoint"
            >
              <Presentation className="h-3 w-3" />
              Exportar PPT
            </button>
          )}
        </div>
      </div>

      {/* Render based on view type - if hideToggle, always show table */}
      {(hideToggle || viewType === 'table') ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-[#0a1117]">
                <tr>
                  {allKeys.map(key => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white"
                    >
                      {formatKeyName(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e9edf1]">
                {paginatedData.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-[#e9edf1] transition-colors',
                      index % 2 === 0 ? 'bg-white' : 'bg-[#f5f7fa]'
                    )}
                  >
                    {allKeys.map(key => (
                      <td
                        key={key}
                        className="px-4 py-3 text-sm text-[#0a1117] whitespace-nowrap"
                      >
                        {formatValue(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Paginação ou contagem simples */}
            {needsPagination ? (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={data.length}
                itemsPerPage={ROWS_PER_PAGE}
                onPageChange={handlePageChange}
              />
            ) : (
              <div className="bg-[#006d5a] px-4 py-2 text-xs font-medium text-white text-right">
                {data.length} {data.length === 1 ? 'registro' : 'registros'}
              </div>
            )}
          </div>
        </>
      ) : (
        <ChartViewer data={data} />
      )}
    </div>
  );
}

/**
 * Renders an object that contains an array of objects (like history field)
 */
function ObjectWithArrayViewer({
  arrayKey,
  arrayData,
  metadata,
  ToggleButton,
}: {
  arrayKey: string;
  arrayData: Record<string, unknown>[];
  metadata: Record<string, unknown>;
  ToggleButton: () => React.ReactElement;
}) {
  return (
    <div>
      <ToggleButton />
      
      {/* Show metadata fields if any */}
      {Object.keys(metadata).length > 0 && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(metadata).map(([key, value]) => (
            <div
              key={key}
              className="rounded-lg border border-border/50 bg-muted/20 p-3"
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {formatKeyName(key)}
              </div>
              <div className="text-sm font-medium text-foreground">
                {formatValue(value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show array as table or chart */}
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-foreground/90 mb-2">
          {formatKeyName(arrayKey)}
        </h4>
        <ArrayTableViewer data={arrayData} />
      </div>
    </div>
  );
}

/**
 * Renders a simple object as formatted cards/grid
 */
function SimpleObjectViewer({
  data,
  ToggleButton,
}: {
  data: Record<string, unknown>;
  ToggleButton: () => React.ReactElement;
}) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return (
      <div>
        <ToggleButton />
        <div className="text-sm text-muted-foreground py-4 text-center">
          Nenhum dado encontrado
        </div>
      </div>
    );
  }

  return (
    <div>
      <ToggleButton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-lg border border-border/50 bg-muted/20 p-3 hover:bg-muted/30 transition-colors"
          >
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              {formatKeyName(key)}
            </div>
            <div className="text-sm font-medium text-foreground">
              {formatValue(value)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground/60 text-right">
        {entries.length} {entries.length === 1 ? 'item' : 'itens'}
      </div>
    </div>
  );
}

