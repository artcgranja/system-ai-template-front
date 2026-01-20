'use client';

import { useState } from 'react';
import { Folder, FolderPlus, MoreVertical, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Folder as FolderType } from '@/types/chat';
import { cn } from '@/lib/utils';

interface FolderItemProps {
  folder: FolderType;
  isExpanded: boolean;
  isActive: boolean;
  onClick: () => void;
  onRename: (folder: FolderType) => void;
  onDelete: (folder: FolderType) => void;
  onToggleExpand: () => void;
  conversationCount: number;
}

function FolderItem({
  folder,
  isExpanded,
  isActive,
  onClick,
  onRename,
  onDelete,
  onToggleExpand,
  conversationCount,
}: FolderItemProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors cursor-pointer',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>

      <div className="flex items-center gap-2 flex-1 min-w-0" onClick={onClick}>
        <Folder
          className="h-4 w-4 shrink-0"
          style={{ color: folder.color || undefined }}
        />
        <span className="flex-1 truncate">{folder.name}</span>
        {conversationCount > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">
            {conversationCount}
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRename(folder)}>
            <Pencil className="mr-2 h-4 w-4" />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(folder)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface FolderManagementProps {
  folders: FolderType[];
  expandedFolders: Set<string>;
  activeFolderId: string | null;
  onFolderClick: (folderId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onCreate: (name: string, color?: string) => Promise<void>;
  onRename: (folderId: string, newName: string) => Promise<void>;
  onDelete: (folderId: string) => Promise<void>;
  getConversationCount: (folderId: string) => number;
}

export function FolderManagement({
  folders,
  expandedFolders,
  activeFolderId,
  onFolderClick,
  onToggleFolder,
  onCreate,
  onRename,
  onDelete,
  getConversationCount,
}: FolderManagementProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#6b7280');

  const handleCreate = async () => {
    if (!folderName.trim()) return;
    await onCreate(folderName, folderColor);
    setIsCreating(false);
    setFolderName('');
    setFolderColor('#6b7280');
  };

  const handleRename = async () => {
    if (!selectedFolder || !folderName.trim()) return;
    await onRename(selectedFolder.id, folderName);
    setIsRenaming(false);
    setSelectedFolder(null);
    setFolderName('');
  };

  const handleDelete = async () => {
    if (!selectedFolder) return;
    await onDelete(selectedFolder.id);
    setIsDeleting(false);
    setSelectedFolder(null);
  };

  const openRenameDialog = (folder: FolderType) => {
    setSelectedFolder(folder);
    setFolderName(folder.name);
    setIsRenaming(true);
  };

  const openDeleteDialog = (folder: FolderType) => {
    setSelectedFolder(folder);
    setIsDeleting(true);
  };

  const folderColors = [
    '#6b7280', // gray
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#06b6d4', // cyan
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
  ];

  return (
    <>
      {/* Folders List */}
      <div className="space-y-1">
        <div className="flex items-center justify-between px-2 py-1">
          <h3 className="text-xs font-semibold text-muted-foreground">Pastas</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsCreating(true)}
          >
            <FolderPlus className="h-4 w-4" />
            <span className="sr-only">Nova pasta</span>
          </Button>
        </div>

        {!folders || folders.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            Nenhuma pasta criada
          </p>
        ) : (
          folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              isExpanded={expandedFolders.has(folder.id)}
              isActive={activeFolderId === folder.id}
              onClick={() => onFolderClick(folder.id)}
              onRename={openRenameDialog}
              onDelete={openDeleteDialog}
              onToggleExpand={() => onToggleFolder(folder.id)}
              conversationCount={getConversationCount(folder.id)}
            />
          ))
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Pasta</DialogTitle>
            <DialogDescription>
              Crie uma pasta para organizar suas conversas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="folder-name" className="text-sm font-medium">
                Nome da pasta
              </label>
              <Input
                id="folder-name"
                placeholder="Ex: Projetos, Pessoal, Trabalho..."
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {folderColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'h-8 w-8 rounded-full border-2 transition-all',
                      folderColor === color
                        ? 'border-primary scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFolderColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!folderName.trim()}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Pasta</DialogTitle>
            <DialogDescription>
              Escolha um novo nome para a pasta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="rename-folder" className="text-sm font-medium">
              Nome da pasta
            </label>
            <Input
              id="rename-folder"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenaming(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!folderName.trim()}>
              Renomear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Pasta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta pasta? As conversas dentro dela
              não serão excluídas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
