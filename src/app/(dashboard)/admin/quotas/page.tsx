'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Edit2, Ban, CheckCircle, Infinity, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminQuotas, useAdminDepartments } from '@/lib/hooks/useAdmin';
import { useQuota } from '@/lib/hooks/useQuota';
import { cn } from '@/lib/utils';
import type { AdminUserQuota, UpdateQuotaPayload } from '@/types/rbac';

export default function AdminQuotasPage() {
  const {
    users,
    total,
    totalSystemUsage,
    isLoading,
    isFetching,
    params,
    updateParams,
    updateQuota,
    suspendUser,
    unsuspendUser,
    isUpdating,
    isSuspending,
    isUnsuspending,
  } = useAdminQuotas();

  const { departments } = useAdminDepartments();
  const { formatTokens, getQuotaColor } = useQuota();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUserQuota | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<AdminUserQuota | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  // Filter users by search query
  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdateQuota = async (userId: string, payload: UpdateQuotaPayload) => {
    await updateQuota(userId, payload);
    setEditingUser(null);
  };

  const handleSuspend = async () => {
    if (!suspendingUser || suspendReason.length < 10) return;
    await suspendUser(suspendingUser.userId, suspendReason);
    setSuspendingUser(null);
    setSuspendReason('');
  };

  const handleUnsuspend = async (userId: string) => {
    await unsuspendUser(userId);
  };

  // Show full page skeleton only on initial load (no data yet)
  const isInitialLoading = isLoading && users.length === 0;

  if (isInitialLoading) {
    return <QuotasPageSkeleton />;
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Cotas</h1>
        <p className="text-muted-foreground">
          Gerencie as cotas de tokens dos usuarios do sistema
        </p>
      </div>

      {/* Content area with subtle opacity during refetch */}
      <div className={cn('space-y-6 transition-opacity duration-200', isFetching && 'opacity-60')}>
        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Uso Total do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTokens(totalSystemUsage)}</div>
              <p className="text-xs text-muted-foreground">tokens consumidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Media por Usuario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {total > 0 ? formatTokens(totalSystemUsage / total) : '0'}
              </div>
              <p className="text-xs text-muted-foreground">tokens/usuario</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>Lista de usuarios e suas cotas</CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={params.departmentId || ''}
                  onChange={(e) => updateParams({ departmentId: e.target.value || undefined })}
                >
                  <option value="">Todos departamentos</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Usuario</th>
                    <th className="text-left py-3 px-4 font-medium">Departamento</th>
                    <th className="text-left py-3 px-4 font-medium">Cargo</th>
                    <th className="text-left py-3 px-4 font-medium">Uso</th>
                    <th className="text-left py-3 px-4 font-medium">Cota</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-right py-3 px-4 font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum usuario encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <UserRow
                        key={user.userId}
                        user={user}
                        formatTokens={formatTokens}
                        getQuotaColor={getQuotaColor}
                        onEdit={() => setEditingUser(user)}
                        onSuspend={() => setSuspendingUser(user)}
                        onUnsuspend={() => handleUnsuspend(user.userId)}
                        isUnsuspending={isUnsuspending}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Quota Dialog */}
      {editingUser && (
        <EditQuotaDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUpdateQuota}
          isLoading={isUpdating}
          formatTokens={formatTokens}
        />
      )}

      {/* Suspend Dialog */}
      {suspendingUser && (
        <Dialog open onOpenChange={() => setSuspendingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Suspender Usuario</DialogTitle>
              <DialogDescription>
                Voce esta prestes a suspender o usuario {suspendingUser.fullName}. Ele nao podera
                mais usar o sistema ate ser reativado.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Motivo da suspensao</label>
                <Input
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Informe o motivo (minimo 10 caracteres)"
                  className="mt-1"
                />
                {suspendReason.length > 0 && suspendReason.length < 10 && (
                  <p className="text-xs text-destructive mt-1">Minimo de 10 caracteres</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSuspendingUser(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleSuspend}
                disabled={suspendReason.length < 10 || isSuspending}
              >
                {isSuspending ? 'Suspendendo...' : 'Suspender'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface UserRowProps {
  user: AdminUserQuota;
  formatTokens: (tokens: number) => string;
  getQuotaColor: (percentage: number) => 'green' | 'yellow' | 'red';
  onEdit: () => void;
  onSuspend: () => void;
  onUnsuspend: () => void;
  isUnsuspending: boolean;
}

function UserRow({
  user,
  formatTokens,
  getQuotaColor,
  onEdit,
  onSuspend,
  onUnsuspend,
  isUnsuspending,
}: UserRowProps) {
  const percentageUsed = Number(user.percentageUsed) || 0;
  const color = getQuotaColor(percentageUsed);
  const barColorClass = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }[color];

  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium">{user.fullName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-sm">{user.departmentName || '-'}</td>
      <td className="py-3 px-4 text-sm">{user.roleName || '-'}</td>
      <td className="py-3 px-4">
        <div className="w-32">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>{formatTokens(user.currentWeeklyUsage)}</span>
            <span className="text-muted-foreground">{percentageUsed.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', barColorClass)}
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        {user.isUnlimited ? (
          <span className="inline-flex items-center gap-1 text-sm text-primary">
            <Infinity className="h-4 w-4" />
            Ilimitado
          </span>
        ) : (
          <span className="text-sm">{formatTokens(user.weeklyQuotaNormalized)}</span>
        )}
      </td>
      <td className="py-3 px-4">
        {user.isSuspended ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
            <Ban className="h-3 w-3" />
            Suspenso
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
            <CheckCircle className="h-3 w-3" />
            Ativo
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/users/${user.userId}`}>
            <Button variant="ghost" size="icon" title="Ver perfil">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          {user.isSuspended ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnsuspend}
              disabled={isUnsuspending}
              className="text-green-600 hover:text-green-700"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSuspend}
              className="text-red-600 hover:text-red-700"
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

interface EditQuotaDialogProps {
  user: AdminUserQuota;
  onClose: () => void;
  onSave: (userId: string, payload: UpdateQuotaPayload) => Promise<void>;
  isLoading: boolean;
  formatTokens: (tokens: number) => string;
}

function EditQuotaDialog({ user, onClose, onSave, isLoading, formatTokens }: EditQuotaDialogProps) {
  const [weeklyQuota, setWeeklyQuota] = useState(user.weeklyQuotaNormalized);
  const [isUnlimited, setIsUnlimited] = useState(user.isUnlimited);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  // Minimum quota of 10,000 tokens (arbitrary reasonable minimum)
  const MIN_QUOTA = 10000;
  // Maximum quota of 100 billion tokens (arbitrary reasonable maximum)
  const MAX_QUOTA = 100000000000;

  const handleQuotaChange = (value: string) => {
    const numValue = Number(value);

    // Clear error when changing
    setQuotaError(null);

    // Handle empty or invalid input
    if (value === '' || isNaN(numValue)) {
      setWeeklyQuota(0);
      return;
    }

    // Validate bounds
    if (numValue < 0) {
      setQuotaError('A cota não pode ser negativa');
      setWeeklyQuota(0);
      return;
    }

    if (numValue > MAX_QUOTA) {
      setQuotaError('A cota excede o limite máximo permitido');
      setWeeklyQuota(MAX_QUOTA);
      return;
    }

    setWeeklyQuota(Math.floor(numValue)); // Ensure integer
  };

  const isValidQuota = isUnlimited || (weeklyQuota >= MIN_QUOTA && weeklyQuota <= MAX_QUOTA);

  const handleSave = async () => {
    if (!isUnlimited && !isValidQuota) {
      setQuotaError(`A cota mínima é de ${formatTokens(MIN_QUOTA)} tokens`);
      return;
    }

    await onSave(user.userId, {
      weeklyQuotaNormalized: isUnlimited ? undefined : weeklyQuota,
      isUnlimited,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Cota</DialogTitle>
          <DialogDescription>
            Altere a cota semanal de tokens para {user.fullName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Uso atual</p>
            <p className="text-lg font-medium">
              {formatTokens(user.currentWeeklyUsage)} / {formatTokens(user.weeklyQuotaNormalized)}
            </p>
            <p className="text-sm text-muted-foreground">{(Number(user.percentageUsed) || 0).toFixed(1)}% usado</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="unlimited"
              checked={isUnlimited}
              onChange={(e) => setIsUnlimited(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="unlimited" className="text-sm font-medium">
              Cota ilimitada
            </label>
          </div>

          {!isUnlimited && (
            <div>
              <label className="text-sm font-medium">Cota semanal (tokens normalizados)</label>
              <Input
                type="number"
                value={weeklyQuota}
                onChange={(e) => handleQuotaChange(e.target.value)}
                className={`mt-1 ${quotaError ? 'border-red-500' : ''}`}
                min={0}
                step={100000}
              />
              {quotaError ? (
                <p className="text-xs text-red-500 mt-1">{quotaError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Equivale a aproximadamente {formatTokens(weeklyQuota)} tokens
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || (!isUnlimited && !isValidQuota)}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuotasPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-[500px]" />
    </div>
  );
}
