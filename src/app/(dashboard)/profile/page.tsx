'use client';

import { User, Building2, Shield, Mail, BadgeCheck, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { QuotaStatsCard } from '@/components/quota';
import { useProfile } from '@/lib/hooks/useProfile';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/stores/authStore';
import {
  PERMISSION_CATEGORY_LABELS,
  PERMISSION_CATEGORY_ORDER,
  type Permission,
} from '@/types/rbac';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { profile, isLoading: isLoadingProfile } = useProfile();
  const { permissions, isLoading: isLoadingPermissions } = usePermissions();

  const isLoading = isLoadingProfile || isLoadingPermissions;

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {getInitials(profile?.fullName || user?.name || 'U')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile?.fullName || user?.name}</h1>
            <p className="text-muted-foreground">{user?.email}</p>
            {profile?.isActive ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <BadgeCheck className="h-4 w-4" />
                Ativo
              </span>
            ) : (
              <span className="text-sm text-red-600 dark:text-red-400">Inativo</span>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informacoes do Perfil
            </CardTitle>
            <CardDescription>Seus dados cadastrais no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
            </div>

            {profile?.employeeId && (
              <div className="flex items-center gap-3">
                <BadgeCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">ID Funcionario</p>
                  <p className="font-medium">{profile.employeeId}</p>
                </div>
              </div>
            )}

            {profile?.onboardedAt && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Membro desde</p>
                  <p className="font-medium">
                    {format(new Date(profile.onboardedAt), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role & Department */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Cargo e Departamento
            </CardTitle>
            <CardDescription>Sua posicao na organizacao</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Departamento</p>
                <p className="font-medium">
                  {profile?.department?.name || permissions?.departmentName || 'Nao definido'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium">
                  {profile?.role?.name || permissions?.roleName || 'Nao definido'}
                </p>
                {permissions?.roleLevel && (
                  <p className="text-xs text-muted-foreground">Nivel {permissions.roleLevel}</p>
                )}
              </div>
            </div>

            {permissions?.isAdmin && (
              <div className="rounded-lg bg-primary/10 p-3 mt-4">
                <p className="text-sm font-medium text-primary">Administrador</p>
                <p className="text-xs text-muted-foreground">
                  Voce tem acesso ao painel administrativo
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Permissoes</CardTitle>
            <CardDescription>O que voce pode fazer no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Permissions by Category */}
              <div className="space-y-3">
                {(() => {
                  // Group permissions by category
                  const permissionsByCategory = (permissions?.permissions || []).reduce(
                    (acc, permission) => {
                      const category = permission.category;
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(permission);
                      return acc;
                    },
                    {} as Record<string, Permission[]>
                  );

                  const hasPermissions = Object.keys(permissionsByCategory).length > 0;

                  if (!hasPermissions) {
                    return (
                      <span className="text-sm text-muted-foreground">Nenhuma permissao atribuida</span>
                    );
                  }

                  return PERMISSION_CATEGORY_ORDER.map((category) => {
                    const categoryPermissions = permissionsByCategory[category];
                    if (!categoryPermissions || categoryPermissions.length === 0) return null;
                    return (
                      <div key={category}>
                        <p className="text-sm text-muted-foreground mb-2">
                          {PERMISSION_CATEGORY_LABELS[category]}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {categoryPermissions.map((permission) => (
                            <span
                              key={permission.id}
                              className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                              title={permission.description}
                            >
                              {permission.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Data Scopes */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Escopo de Dados</p>
                <div className="flex flex-wrap gap-2">
                  {permissions?.dataScopes.map((scope) => (
                    <span
                      key={scope}
                      className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium"
                    >
                      {getScopeLabel(scope)}
                    </span>
                  ))}
                  {(!permissions?.dataScopes || permissions.dataScopes.length === 0) && (
                    <span className="text-sm text-muted-foreground">Nenhum escopo</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Token Usage Stats */}
        <QuotaStatsCard />
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6 pb-12">
        <div className="flex items-center gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}

function getScopeLabel(scope: string): string {
  const labels: Record<string, string> = {
    own: 'Proprio',
    department: 'Departamento',
    all: 'Todos',
  };
  return labels[scope] || scope;
}
