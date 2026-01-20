'use client';

import { useState } from 'react';
import { Folder, FolderInput, Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useChatStore, type OperationType } from '@/lib/stores/chatStore';
import { cn } from '@/lib/utils';

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (folderId: string | null) => void;
  conversationId?: string | null;
  isOperationLoading?: (operation: OperationType, id: string) => boolean;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  onConfirm,
  conversationId,
  isOperationLoading,
}: MoveToFolderDialogProps) {
  const folders = useChatStore(useShallow((state) => state.folders));
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const isLoading = conversationId && isOperationLoading
    ? isOperationLoading('move-conversation', conversationId)
    : false;

  const handleConfirm = () => {
    onConfirm(selectedFolderId);
    setSelectedFolderId(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedFolderId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mover para pasta</DialogTitle>
          <DialogDescription>
            Selecione uma pasta para mover esta conversa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
          {/* Opção para remover da pasta */}
          <button
            onClick={() => setSelectedFolderId(null)}
            disabled={isLoading}
            className={cn(
              'w-full flex items-center gap-2 p-3 rounded-lg border transition-colors',
              selectedFolderId === null
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-accent',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <FolderInput className="h-4 w-4" />
            <span>Sem pasta</span>
          </button>

          {/* Lista de pastas */}
          {(folders || []).map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              disabled={isLoading}
              className={cn(
                'w-full flex items-center gap-2 p-3 rounded-lg border transition-colors',
                selectedFolderId === folder.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-accent',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Folder className="h-4 w-4" style={{ color: folder.color }} />
              <span>{folder.name}</span>
            </button>
          ))}

          {(!folders || folders.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma pasta criada ainda
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Movendo...
              </>
            ) : (
              'Mover'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
