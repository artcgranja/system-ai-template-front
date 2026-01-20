'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Shield, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminRoles, useAdminPermissions } from '@/lib/hooks/useAdmin';
import { cn } from '@/lib/utils';
import {
  PERMISSION_CATEGORY_LABELS,
  PERMISSION_CATEGORY_ORDER,
  type Role,
  type Permission,
  type GroupedPermissions,
  type DataScope,
  type CreateRolePayload,
} from '@/types/rbac';

const AVAILABLE_SCOPES: DataScope[] = ['own', 'department', 'all'];

const scopeLabels: Record<DataScope, string> = {
  own: 'Proprio',
  department: 'Departamento',
  all: 'Todos',
};

export default function AdminRolesPage() {
  const {
    roles,
    isLoading: isLoadingRoles,
    createRole,
    updateRole,
    deleteRole,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAdminRoles();

  const {
    groupedPermissions,
    isLoading: isLoadingPermissions,
  } = useAdminPermissions();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const isLoading = isLoadingRoles || isLoadingPermissions;

  const handleCreate = async (data: CreateRolePayload) => {
    await createRole(data);
    setShowCreateDialog(false);
  };

  const handleUpdate = async (id: string, data: CreateRolePayload) => {
    await updateRole(id, data);
    setEditingRole(null);
  };

  const handleDelete = async () => {
    if (!deletingRole) return;
    await deleteRole(deletingRole.id);
    setDeletingRole(null);
  };

  if (isLoading) {
    return <RolesPageSkeleton />;
  }

  // Sort roles by level (higher level first)
  const sortedRoles = [...roles].sort((a, b) => a.level - b.level);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cargos</h1>
          <p className="text-muted-foreground">
            Gerencie os cargos e permissoes do sistema
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cargo
        </Button>
      </div>

      <div className="space-y-4">
        {sortedRoles.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum cargo cadastrado
            </CardContent>
          </Card>
        ) : (
          sortedRoles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={() => setEditingRole(role)}
              onDelete={() => setDeletingRole(role)}
            />
          ))
        )}
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <RoleFormDialog
          groupedPermissions={groupedPermissions}
          onClose={() => setShowCreateDialog(false)}
          onSave={handleCreate}
          isLoading={isCreating}
          title="Novo Cargo"
        />
      )}

      {/* Edit Dialog */}
      {editingRole && (
        <RoleFormDialog
          role={editingRole}
          groupedPermissions={groupedPermissions}
          onClose={() => setEditingRole(null)}
          onSave={(data) => handleUpdate(editingRole.id, data)}
          isLoading={isUpdating}
          title="Editar Cargo"
        />
      )}

      {/* Delete Confirmation */}
      {deletingRole && (
        <Dialog open onOpenChange={() => setDeletingRole(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusao</DialogTitle>
              <DialogDescription>
                {deletingRole.isSystemRole ? (
                  <>Este cargo do sistema nao pode ser excluido.</>
                ) : (
                  <>
                    Tem certeza que deseja excluir o cargo &quot;{deletingRole.name}&quot;? Esta
                    acao nao pode ser desfeita.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingRole(null)}>
                {deletingRole.isSystemRole ? 'Fechar' : 'Cancelar'}
              </Button>
              {!deletingRole.isSystemRole && (
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? 'Excluindo...' : 'Excluir'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// =============================================================================
// Role Card Component
// =============================================================================

interface RoleCardProps {
  role: Role;
  onEdit: () => void;
  onDelete: () => void;
}

function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
  // Group permissions by category for display
  const permissionsByCategory = role.permissions.reduce(
    (acc, permission) => {
      const category = permission.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(permission);
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                role.level === 1
                  ? 'bg-primary text-primary-foreground'
                  : role.level <= 2
                    ? 'bg-blue-500 text-white'
                    : 'bg-muted'
              )}
            >
              {role.isSystemRole ? (
                <Lock className="h-5 w-5" />
              ) : (
                <Shield className="h-5 w-5" />
              )}
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {role.name}
                <span className="text-sm font-normal text-muted-foreground">
                  (Nivel {role.level})
                </span>
                {role.isSystemRole && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Sistema
                  </span>
                )}
              </CardTitle>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              disabled={role.isSystemRole}
              title={role.isSystemRole ? 'Cargos do sistema nao podem ser editados' : 'Editar'}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={role.isSystemRole}
              title={role.isSystemRole ? 'Cargos do sistema nao podem ser excluidos' : 'Excluir'}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Data Scopes */}
          <div>
            <p className="text-sm font-medium mb-2">Escopo de Dados</p>
            <div className="flex flex-wrap gap-1">
              {role.dataScopes.map((scope) => (
                <span
                  key={scope}
                  className="px-2 py-0.5 rounded-full bg-muted text-xs"
                >
                  {scopeLabels[scope]}
                </span>
              ))}
            </div>
          </div>

          {/* Permissions by Category */}
          <div>
            <p className="text-sm font-medium mb-2">Permissoes</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {PERMISSION_CATEGORY_ORDER.map((category) => {
                const permissions = permissionsByCategory[category];
                if (!permissions || permissions.length === 0) return null;
                return (
                  <div key={category} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {PERMISSION_CATEGORY_LABELS[category]}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {permissions.map((permission) => (
                        <span
                          key={permission.id}
                          className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                          title={permission.description}
                        >
                          {permission.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Role Form Dialog
// =============================================================================

interface RoleFormDialogProps {
  role?: Role;
  groupedPermissions: GroupedPermissions;
  onClose: () => void;
  onSave: (data: CreateRolePayload) => Promise<void>;
  isLoading: boolean;
  title: string;
}

function RoleFormDialog({
  role,
  groupedPermissions,
  onClose,
  onSave,
  isLoading,
  title,
}: RoleFormDialogProps) {
  const [name, setName] = useState(role?.name || '');
  const [level, setLevel] = useState(role?.level || 3);
  const [description, setDescription] = useState(role?.description || '');
  const [dataScopes, setDataScopes] = useState<DataScope[]>(role?.dataScopes || []);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>(
    role?.permissions.map((p) => p.id) || []
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(PERMISSION_CATEGORY_ORDER)
  );

  const toggleScope = (scope: DataScope) => {
    setDataScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const selectAllInCategory = (category: string) => {
    const categoryPermissions = groupedPermissions[category] || [];
    const categoryIds = categoryPermissions.map((p) => p.id);
    const allSelected = categoryIds.every((id) => selectedPermissionIds.includes(id));

    if (allSelected) {
      // Deselect all in category
      setSelectedPermissionIds((prev) => prev.filter((id) => !categoryIds.includes(id)));
    } else {
      // Select all in category
      setSelectedPermissionIds((prev) => [...new Set([...prev, ...categoryIds])]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const payload: CreateRolePayload = {
      name: name.trim(),
      level,
      dataScopes,
      permissionIds: selectedPermissionIds,
      description: description.trim() || undefined,
    };

    await onSave(payload);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do cargo"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Nivel (1-5)</label>
              <Input
                type="number"
                value={level}
                onChange={(e) => setLevel(Math.min(5, Math.max(1, Number(e.target.value))))}
                min={1}
                max={5}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                1 = Admin, 5 = Visualizador
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Descricao (opcional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descricao do cargo"
              className="mt-1"
            />
          </div>

          {/* Data Scopes */}
          <div>
            <label className="text-sm font-medium mb-2 block">Escopo de Dados</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    dataScopes.includes(scope)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted'
                  )}
                >
                  {scopeLabels[scope]}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions by Category */}
          <div>
            <label className="text-sm font-medium mb-2 block">Permissoes</label>
            <div className="space-y-2 border rounded-lg">
              {PERMISSION_CATEGORY_ORDER.map((category) => {
                const permissions = groupedPermissions[category] || [];
                if (permissions.length === 0) return null;

                const isExpanded = expandedCategories.has(category);
                const selectedCount = permissions.filter((p) =>
                  selectedPermissionIds.includes(p.id)
                ).length;
                const allSelected = selectedCount === permissions.length;

                return (
                  <div key={category} className="border-b last:border-b-0">
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{PERMISSION_CATEGORY_LABELS[category]}</span>
                        <span className="text-xs text-muted-foreground">
                          ({selectedCount}/{permissions.length})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAllInCategory(category);
                        }}
                      >
                        {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-3 grid gap-2 sm:grid-cols-2">
                        {permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start gap-2 p-2 rounded hover:bg-muted/50"
                          >
                            <Checkbox
                              id={permission.id}
                              checked={selectedPermissionIds.includes(permission.id)}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <div className="grid gap-0.5">
                              <label
                                htmlFor={permission.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {permission.name}
                              </label>
                              {permission.description && (
                                <p className="text-xs text-muted-foreground">
                                  {permission.description}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground font-mono">
                                {permission.code}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || selectedPermissionIds.length === 0 || isLoading}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

function RolesPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}
