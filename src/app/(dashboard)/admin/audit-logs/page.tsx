'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  Server,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAuditLogs } from '@/lib/hooks/useAdmin';
import { cn } from '@/lib/utils';
import type { AuditLog, AuditStatus, AuditHttpMethod } from '@/types/rbac';

const httpMethods: { value: AuditHttpMethod; label: string }[] = [
  { value: 'GET', label: 'GET (Leitura)' },
  { value: 'POST', label: 'POST (Criacao)' },
  { value: 'PUT', label: 'PUT (Atualizacao)' },
  { value: 'PATCH', label: 'PATCH (Atualizacao Parcial)' },
  { value: 'DELETE', label: 'DELETE (Exclusao)' },
];

const dateRangeOptions = [
  { value: '7', label: 'Ultimos 7 dias' },
  { value: '14', label: 'Ultimos 14 dias' },
  { value: '30', label: 'Ultimos 30 dias' },
  { value: '60', label: 'Ultimos 60 dias' },
  { value: '90', label: 'Ultimos 90 dias' },
];

export default function AdminAuditLogsPage() {
  const { logs, total, page, pageSize, totalPages, isLoading, isFetching, params, updateParams, resetParams, refetch } =
    useAdminAuditLogs({ page: 1, pageSize: 25 });

  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('');

  const calculatedTotalPages = totalPages || Math.ceil(total / pageSize);

  const handleNextPage = () => {
    if (page < calculatedTotalPages) {
      updateParams({ page: page + 1 });
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      updateParams({ page: page - 1 });
    }
  };

  const handleDateRangeChange = (days: string) => {
    setDateRange(days);
    if (days) {
      const parsedDays = parseInt(days, 10);

      // Validate parsed number
      if (isNaN(parsedDays) || parsedDays <= 0) {
        updateParams({ startDate: undefined, endDate: undefined });
        return;
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parsedDays);
      updateParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    } else {
      updateParams({ startDate: undefined, endDate: undefined });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateRange('');
    resetParams();
  };

  // Filtro client-side por nome de usuário
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.userName?.toLowerCase().includes(query) ||
        log.userId?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  // Show full page skeleton only on initial load (no data yet)
  const isInitialLoading = isLoading && logs.length === 0;

  if (isInitialLoading) {
    return <AuditLogsPageSkeleton />;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
          <p className="text-muted-foreground">Historico de acoes no sistema</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
          {isFetching ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={params.action || ''}
              onChange={(e) => updateParams({ action: e.target.value || undefined })}
            >
              <option value="">Todos os metodos</option>
              {httpMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={params.status || ''}
              onChange={(e) => updateParams({ status: (e.target.value as AuditStatus) || undefined })}
            >
              <option value="">Todos os status</option>
              <option value="success">Sucesso</option>
              <option value="error">Erro</option>
            </select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                className="h-10 rounded-md border border-input bg-background pl-10 pr-3 text-sm"
                value={dateRange}
                onChange={(e) => handleDateRangeChange(e.target.value)}
              >
                <option value="">Todos os periodos</option>
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="ghost" onClick={handleResetFilters}>
              Limpar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table - with subtle opacity during refetch */}
      <Card className={cn('transition-opacity duration-200', isFetching && 'opacity-60')}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registros</CardTitle>
              <CardDescription>
                {searchQuery
                  ? `${filteredLogs.length} de ${total} registros (filtrado por "${searchQuery}")`
                  : `${total} registros encontrados`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium w-8"></th>
                  <th className="text-left py-3 px-4 font-medium">Data/Hora</th>
                  <th className="text-left py-3 px-4 font-medium">Usuario</th>
                  <th className="text-left py-3 px-4 font-medium">Acao</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => <LogRow key={log.id} log={log} />)
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {calculatedTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Pagina {page} de {calculatedTotalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={page >= calculatedTotalPages}
                >
                  Proxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);

  // Extrair metodo HTTP da action (ex: "POST /api/chat" -> "POST")
  const httpMethod = log.action.split(' ')[0];

  const hasDetails =
    log.details || log.oldValue || log.newValue || log.queryText || log.userAgent;

  return (
    <>
      <tr
        className={cn('border-b hover:bg-muted/50', hasDetails && 'cursor-pointer')}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <td className="py-3 px-4">
          {hasDetails && (
            <ChevronDown
              className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
            />
          )}
        </td>
        <td className="py-3 px-4 text-sm">
          {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
        </td>
        <td className="py-3 px-4">
          {log.userId ? (
            <div>
              <p className="font-medium text-sm">{log.userName || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground">{log.userId.slice(0, 8)}...</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Server className="h-4 w-4" />
              <span className="text-sm">Sistema</span>
            </div>
          )}
        </td>
        <td className="py-3 px-4">
          <span
            className={cn(
              'px-2 py-1 rounded text-xs font-mono',
              httpMethod === 'GET' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              httpMethod === 'POST' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              httpMethod === 'PUT' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
              httpMethod === 'PATCH' &&
                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
              httpMethod === 'DELETE' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(httpMethod) && 'bg-muted'
            )}
          >
            {log.action}
          </span>
        </td>
        <td className="py-3 px-4">
          {log.status === 'success' ? (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Sucesso</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-red-600 dark:text-red-400"
              title={log.details?.error as string}
            >
              <XCircle className="h-4 w-4" />
              <span className="text-xs">Erro</span>
            </span>
          )}
        </td>
        <td className="py-3 px-4 text-sm text-muted-foreground">{log.ipAddress || '-'}</td>
      </tr>

      {/* Linha expandida com detalhes */}
      {expanded && hasDetails && (
        <tr>
          <td colSpan={6} className="bg-muted/30 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {log.details && (
                <div className="space-y-1">
                  <h4 className="font-medium text-muted-foreground">Detalhes</h4>
                  <div className="bg-background rounded p-3 font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </div>
                </div>
              )}

              {log.oldValue && (
                <div className="space-y-1">
                  <h4 className="font-medium text-muted-foreground">Valor Anterior</h4>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(log.oldValue, null, 2)}</pre>
                  </div>
                </div>
              )}

              {log.newValue && (
                <div className="space-y-1">
                  <h4 className="font-medium text-muted-foreground">Novo Valor</h4>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded p-3 font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(log.newValue, null, 2)}</pre>
                  </div>
                </div>
              )}

              {log.queryText && (
                <div className="space-y-1">
                  <h4 className="font-medium text-muted-foreground">Query</h4>
                  <p className="bg-background rounded p-3">{log.queryText}</p>
                  {log.resultsCount !== null && log.resultsCount !== undefined && (
                    <p className="text-muted-foreground">Resultados: {log.resultsCount}</p>
                  )}
                </div>
              )}

              {log.userAgent && (
                <div className="space-y-1">
                  <h4 className="font-medium text-muted-foreground">User Agent</h4>
                  <p className="bg-background rounded p-3 text-xs truncate" title={log.userAgent}>
                    {log.userAgent}
                  </p>
                </div>
              )}

              {log.resourceType && (
                <div className="space-y-1">
                  <h4 className="font-medium text-muted-foreground">Recurso</h4>
                  <p className="bg-background rounded p-3">
                    {log.resourceType}
                    {log.resourceId && (
                      <span className="text-muted-foreground ml-2">({log.resourceId})</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function AuditLogsPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-[500px]" />
    </div>
  );
}
