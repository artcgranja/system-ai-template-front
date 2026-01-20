'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserBreakdown, UserBreakdownItem } from '@/types/analytics';

interface UserBreakdownTableProps {
  userBreakdown?: UserBreakdown;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString('pt-BR');
}

function UserRow({ user }: { user: UserBreakdownItem }) {
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-sm">{user.fullName}</p>
          <p className="text-xs text-muted-foreground">{user.roleName}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-sm">{user.departmentName}</td>
      <td className="py-3 px-4 text-sm font-mono">{formatNumber(user.normalizedTokens)}</td>
      <td className="py-3 px-4 text-sm">{formatNumber(user.requestCount)}</td>
      <td className="py-3 px-4 text-sm">{user.conversationCount}</td>
      <td className="py-3 px-4 text-sm text-center">{user.activeDays}</td>
      <td className="py-3 px-4">
        <Link href={`/admin/users/${user.userId}`}>
          <Button variant="ghost" size="icon" title="Ver perfil">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function UserBreakdownTable({
  userBreakdown,
  isLoading,
  onPageChange,
}: UserBreakdownTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  const users = userBreakdown?.users ?? [];
  const total = userBreakdown?.total ?? 0;
  const page = userBreakdown?.page ?? 1;
  const totalPages = userBreakdown?.totalPages ?? 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Detalhamento por Usuario</CardTitle>
            <CardDescription>
              {total} {total === 1 ? 'usuario' : 'usuarios'} encontrados
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-sm">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Departamento</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Tokens</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Requisicoes</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Conversas</th>
                <th className="text-center py-3 px-4 font-medium text-sm">Dias Ativos</th>
                <th className="text-left py-3 px-4 font-medium text-sm">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum usuario encontrado
                  </td>
                </tr>
              ) : (
                users.map((user) => <UserRow key={user.userId} user={user} />)
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && onPageChange && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Pagina {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Proxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
