'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
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
import { useAdminDepartments } from '@/lib/hooks/useAdmin';
import type { Department } from '@/types/rbac';

export default function AdminDepartmentsPage() {
  const {
    departments,
    isLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    isCreating,
    isUpdating,
    isDeleting,
  } = useAdminDepartments();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);

  const handleCreate = async (data: { name: string; description?: string }) => {
    await createDepartment(data);
    setShowCreateDialog(false);
  };

  const handleUpdate = async (id: string, data: { name: string; description?: string }) => {
    await updateDepartment(id, data);
    setEditingDepartment(null);
  };

  const handleDelete = async () => {
    if (!deletingDepartment) return;
    await deleteDepartment(deletingDepartment.id);
    setDeletingDepartment(null);
  };

  if (isLoading) {
    return <DepartmentsPageSkeleton />;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">Gerencie os departamentos da organizacao</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Departamento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum departamento cadastrado
            </CardContent>
          </Card>
        ) : (
          departments.map((dept) => (
            <Card key={dept.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingDepartment(dept)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingDepartment(dept)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {dept.description && (
                  <CardDescription>{dept.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <DepartmentFormDialog
          onClose={() => setShowCreateDialog(false)}
          onSave={handleCreate}
          isLoading={isCreating}
          title="Novo Departamento"
        />
      )}

      {/* Edit Dialog */}
      {editingDepartment && (
        <DepartmentFormDialog
          department={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onSave={(data) => handleUpdate(editingDepartment.id, data)}
          isLoading={isUpdating}
          title="Editar Departamento"
        />
      )}

      {/* Delete Confirmation */}
      {deletingDepartment && (
        <Dialog open onOpenChange={() => setDeletingDepartment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusao</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o departamento &quot;{deletingDepartment.name}
                &quot;? Esta acao nao pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingDepartment(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface DepartmentFormDialogProps {
  department?: Department;
  onClose: () => void;
  onSave: (data: { name: string; description?: string }) => Promise<void>;
  isLoading: boolean;
  title: string;
}

function DepartmentFormDialog({
  department,
  onClose,
  onSave,
  isLoading,
  title,
}: DepartmentFormDialogProps) {
  const [name, setName] = useState(department?.name || '');
  const [description, setDescription] = useState(department?.description || '');

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await onSave({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do departamento"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Descricao (opcional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descricao do departamento"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepartmentsPageSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}
