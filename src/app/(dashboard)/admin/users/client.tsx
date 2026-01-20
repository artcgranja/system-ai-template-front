'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, UserPlus, UserPlus2, Building2, Shield, Check, X, Eye, EyeOff, Copy, CheckCheck, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminUsers, useAdminDepartments, useAdminRoles } from '@/lib/hooks/useAdmin';
import type { OnboardUserPayload, AdminUser, CreateUserPayload, CreateUserResponse, Department, Role } from '@/types/rbac';

interface AdminUsersClientProps {
  initialUsers: AdminUser[];
  initialTotal: number;
  initialDepartments: Department[];
  initialRoles: Role[];
}

/**
 * Admin Users Client Component
 * Receives initial data from server, handles interactivity
 */
export function AdminUsersClient({
  initialUsers,
  initialTotal,
  initialDepartments,
  initialRoles,
}: AdminUsersClientProps) {
  const { users, total, isLoading, isFetching, params, updateParams, onboardUser, isOnboarding, createUser, isCreatingUser } =
    useAdminUsers();
  const { departments } = useAdminDepartments();
  const { roles } = useAdminRoles();

  // Use server data if client data not available yet
  const currentUsers = users.length > 0 ? users : initialUsers;
  const currentTotal = total > 0 ? total : initialTotal;
  const currentDepartments = departments.length > 0 ? departments : initialDepartments;
  const currentRoles = roles.length > 0 ? roles : initialRoles;

  const [searchQuery, setSearchQuery] = useState('');
  const [showOnboardDialog, setShowOnboardDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);

  // Filter users by search query
  const filteredUsers = currentUsers.filter(
    (user) =>
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOnboard = async (payload: OnboardUserPayload) => {
    await onboardUser(payload);
    setShowOnboardDialog(false);
  };

  // Show full page skeleton only on initial load with no server data
  const isInitialLoading = isLoading && currentUsers.length === 0 && initialUsers.length === 0;

  if (isInitialLoading) {
    return <UsersPageSkeleton />;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Usuarios</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os usuarios do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowOnboardDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Onboarding
          </Button>
          <Button onClick={() => setShowCreateUserDialog(true)}>
            <UserPlus2 className="h-4 w-4 mr-2" />
            Criar Usuario
          </Button>
        </div>
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
              <div className="text-2xl font-bold">{currentTotal}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentUsers.filter((u) => u.isActive).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentDepartments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>Lista de usuarios cadastrados</CardDescription>
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
                  {currentDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={params.roleId || ''}
                  onChange={(e) => updateParams({ roleId: e.target.value || undefined })}
                >
                  <option value="">Todos cargos</option>
                  {currentRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
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
                    <th className="text-left py-3 px-4 font-medium">ID Funcionario</th>
                    <th className="text-left py-3 px-4 font-medium">Departamento</th>
                    <th className="text-left py-3 px-4 font-medium">Cargo</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Data Onboarding</th>
                    <th className="text-left py-3 px-4 font-medium">Acoes</th>
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
                    filteredUsers.map((user) => <UserRow key={user.userId} user={user} />)
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onboard Dialog */}
      {showOnboardDialog && (
        <OnboardDialog
          onClose={() => setShowOnboardDialog(false)}
          onSave={handleOnboard}
          isLoading={isOnboarding}
          departments={currentDepartments}
          roles={currentRoles}
        />
      )}

      {/* Create User Dialog */}
      {showCreateUserDialog && (
        <CreateUserDialog
          onClose={() => setShowCreateUserDialog(false)}
          onSave={createUser}
          isLoading={isCreatingUser}
          departments={currentDepartments}
          roles={currentRoles}
        />
      )}
    </div>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  return (
    <tr className="border-b hover:bg-muted/50">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium">{user.fullName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-sm">{user.employeeId || '-'}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{user.departmentName || '-'}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{user.roleName || '-'}</span>
          {user.roleLevel && (
            <span className="text-xs text-muted-foreground">(N{user.roleLevel})</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        {user.isActive ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
            <Check className="h-3 w-3" />
            Ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
            <X className="h-3 w-3" />
            Inativo
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-sm">
        {user.onboardedAt
          ? format(new Date(user.onboardedAt), 'dd/MM/yyyy', { locale: ptBR })
          : '-'}
      </td>
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

interface OnboardDialogProps {
  onClose: () => void;
  onSave: (payload: OnboardUserPayload) => Promise<void>;
  isLoading: boolean;
  departments: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

function OnboardDialog({ onClose, onSave, isLoading, departments, roles }: OnboardDialogProps) {
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');

  const isValid = userId && fullName && departmentId && roleId;

  const handleSubmit = async () => {
    if (!isValid) return;
    await onSave({
      userId,
      fullName,
      employeeId: employeeId || undefined,
      departmentId,
      roleId,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Onboarding de Usuario</DialogTitle>
          <DialogDescription>
            Associe um usuario do Supabase a um departamento e cargo
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">ID do Usuario (Supabase)</label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID do usuario"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nome Completo</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do funcionario"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">ID Funcionario (opcional)</label>
            <Input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Ex: EMP001"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Departamento</label>
            <select
              className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Cargo</label>
            <select
              className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 text-sm"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateUserDialogProps {
  onClose: () => void;
  onSave: (payload: CreateUserPayload) => Promise<CreateUserResponse>;
  isLoading: boolean;
  departments: { id: string; name: string }[];
  roles: { id: string; name: string }[];
}

function CreateUserDialog({ onClose, onSave, isLoading, departments, roles }: CreateUserDialogProps) {
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [weeklyQuota, setWeeklyQuota] = useState('');
  const [isUnlimited, setIsUnlimited] = useState(false);

  // Success/Error state
  const [createdUser, setCreatedUser] = useState<CreateUserResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidPassword = password.length >= 8;
  const isValid = email && isValidEmail && password && isValidPassword && departmentId && roleId;

  const handleSubmit = async () => {
    if (!isValid) return;
    setError(null);

    try {
      const result = await onSave({
        email,
        password,
        departmentId,
        roleId,
        fullName: fullName || undefined,
        employeeId: employeeId || undefined,
        weeklyQuotaNormalized: weeklyQuota ? parseInt(weeklyQuota, 10) : undefined,
        isUnlimited,
      });
      setCreatedUser(result);
    } catch (err) {
      let errorMessage = 'Erro ao criar usuario';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        errorMessage = (err as { message: string }).message;
      }

      setError(errorMessage);
    }
  };

  const copyToClipboard = async () => {
    if (createdUser?.temporaryPassword) {
      await navigator.clipboard.writeText(createdUser.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCreatedUser(null);
    onClose();
  };

  // Success state UI
  if (createdUser) {
    return (
      <Dialog open onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Usuario Criado com Sucesso
            </DialogTitle>
            <DialogDescription>
              O usuario foi criado. Compartilhe a senha temporaria com o usuario de forma segura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4 space-y-2">
              <p className="text-sm"><strong>Email:</strong> {createdUser.email}</p>
              {createdUser.fullName && (
                <p className="text-sm"><strong>Nome:</strong> {createdUser.fullName}</p>
              )}
              <p className="text-sm"><strong>Cargo:</strong> {createdUser.roleName}</p>
              <p className="text-sm"><strong>Departamento:</strong> {createdUser.departmentName}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Senha Temporaria</label>
              <div className="flex mt-1 gap-2">
                <code className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                  {createdUser.temporaryPassword}
                </code>
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                O usuario devera alterar esta senha no primeiro acesso.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Form state UI
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar Novo Usuario</DialogTitle>
          <DialogDescription>
            Crie um novo usuario com credenciais de acesso ao sistema
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@vora.com.br"
              className="mt-1"
            />
            {email && !isValidEmail && (
              <p className="text-xs text-destructive mt-1">Email invalido</p>
            )}
          </div>

          {/* Password with visibility toggle */}
          <div>
            <label className="text-sm font-medium">Senha</label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 8 caracteres"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && !isValidPassword && (
              <p className="text-xs text-destructive mt-1">Senha deve ter no minimo 8 caracteres</p>
            )}
          </div>

          {/* Full Name (optional) */}
          <div>
            <label className="text-sm font-medium">Nome Completo (opcional)</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do funcionario"
              className="mt-1"
            />
          </div>

          {/* Employee ID (optional) */}
          <div>
            <label className="text-sm font-medium">ID Funcionario (opcional)</label>
            <Input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="Ex: EMP001"
              className="mt-1"
            />
          </div>

          {/* Department */}
          <div>
            <label className="text-sm font-medium">Departamento</label>
            <select
              className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 text-sm"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="text-sm font-medium">Cargo</label>
            <select
              className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 text-sm"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Options */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Opcoes avancadas
            </button>
            {showAdvanced && (
              <div className="pt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Cota Semanal (tokens)</label>
                  <Input
                    type="number"
                    value={weeklyQuota}
                    onChange={(e) => setWeeklyQuota(e.target.value)}
                    placeholder="Padrao: 2.000.000"
                    className="mt-1"
                    disabled={isUnlimited}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isUnlimited"
                    checked={isUnlimited}
                    onCheckedChange={(checked) => setIsUnlimited(checked === true)}
                  />
                  <label htmlFor="isUnlimited" className="text-sm">
                    Cota ilimitada
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isLoading}>
            {isLoading ? 'Criando...' : 'Criar Usuario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
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
