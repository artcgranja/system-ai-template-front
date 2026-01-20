'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  MessageSquare,
  MoreVertical,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  FolderInput,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversations } from '@/lib/hooks/useConversations';
import { groupConversationsByDate, truncateText } from '@/lib/utils/helpers';
import { ROUTES } from '@/config/constants';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoveToFolderDialog } from './MoveToFolderDialog';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isPinned?: boolean;
  onClick: () => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  onPin: (conversation: Conversation) => void;
  onMoveToFolder: (conversation: Conversation) => void;
  isDragging?: boolean;
}

function ConversationItem({
  conversation,
  isActive,
  isPinned = false,
  onClick,
  onRename,
  onDelete,
  onPin,
  onMoveToFolder,
  isDragging = false,
}: ConversationItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: conversation.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all',
        isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
        isDragging && 'shadow-lg'
      )}
    >
      {/* Drag handle */}
      <div {...listeners} className="shrink-0 cursor-grab active:cursor-grabbing">
        {isPinned ? (
          <Pin className="h-4 w-4 text-primary fill-primary" />
        ) : (
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Clickable area */}
      <button
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center text-left"
      >
        <span className="truncate">{truncateText(conversation.title, 30)}</span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3 w-3" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onPin(conversation)}>
            {isPinned ? (
              <>
                <PinOff className="mr-2 h-4 w-4" />
                Desafixar
              </>
            ) : (
              <>
                <Pin className="mr-2 h-4 w-4" />
                Fixar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onMoveToFolder(conversation)}>
            <FolderInput className="mr-2 h-4 w-4" />
            Mover para pasta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onRename(conversation)}>
            <Pencil className="mr-2 h-4 w-4" />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(conversation)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface ConversationHistoryProps {
  activeFolderId?: string | null;
}

export function ConversationHistory({ activeFolderId }: ConversationHistoryProps) {
  const {
    conversations,
    renameConversation,
    deleteConversation,
    togglePinConversation,
    moveConversationToFolder,
  } = useConversations();
  const router = useRouter();
  const pathname = usePathname();

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Filter conversations based on active folder
  const filteredConversations = activeFolderId
    ? (conversations || []).filter((c) => c.folderId === activeFolderId)
    : (conversations || []).filter((c) => !c.folderId);

  // Separate pinned and unpinned conversations
  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const unpinnedConversations = filteredConversations.filter((c) => !c.isPinned);
  const groupedConversations = groupConversationsByDate(unpinnedConversations);

  const handleConversationClick = (id: string) => {
    router.push(ROUTES.chatWithId(id));
  };

  const handleRename = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setNewTitle(conversation.title);
    setRenameDialogOpen(true);
  };

  const handleDelete = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setDeleteDialogOpen(true);
  };

  const handlePin = async (conversation: Conversation) => {
    await togglePinConversation(conversation.id);
  };

  const handleMoveToFolder = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMoveDialogOpen(true);
  };

  const confirmRename = async () => {
    if (selectedConversation && newTitle.trim()) {
      await renameConversation(selectedConversation.id, newTitle.trim());
      setRenameDialogOpen(false);
      setSelectedConversation(null);
      setNewTitle('');
    }
  };

  const confirmDelete = async () => {
    if (selectedConversation) {
      await deleteConversation(selectedConversation.id);
      setDeleteDialogOpen(false);
      setSelectedConversation(null);

      if (pathname === ROUTES.chatWithId(selectedConversation.id)) {
        router.push(ROUTES.chat);
      }
    }
  };

  const confirmMove = async (folderId: string | null) => {
    if (selectedConversation) {
      await moveConversationToFolder(selectedConversation.id, folderId);
      setMoveDialogOpen(false);
      setSelectedConversation(null);
    }
  };

  const isActive = (id: string) => pathname === ROUTES.chatWithId(id);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // TODO: Implement reordering logic
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeConversation = (conversations || []).find((c) => c.id === activeId);

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-4 py-4">
            {/* Pinned Conversations */}
            {pinnedConversations.length > 0 && (
              <div>
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                  Fixadas
                </h3>
                <SortableContext
                  items={pinnedConversations.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {pinnedConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={isActive(conversation.id)}
                        isPinned
                        onClick={() => handleConversationClick(conversation.id)}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onPin={handlePin}
                        onMoveToFolder={handleMoveToFolder}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            )}

            {/* Time-grouped Conversations */}
            {groupedConversations.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </h3>
                <SortableContext
                  items={group.conversations.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {group.conversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={isActive(conversation.id)}
                        onClick={() => handleConversationClick(conversation.id)}
                        onRename={handleRename}
                        onDelete={handleDelete}
                        onPin={handlePin}
                        onMoveToFolder={handleMoveToFolder}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            ))}

            {filteredConversations.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda
              </p>
            )}
          </div>
        </ScrollArea>

        <DragOverlay>
          {activeConversation && (
            <div className="rounded-lg bg-accent p-2 shadow-lg">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate">{activeConversation.title}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear conversa</DialogTitle>
            <DialogDescription>Digite um novo nome para a conversa</DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nome da conversa"
            onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmRename} disabled={!newTitle.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar conversa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        onConfirm={confirmMove}
      />
    </>
  );
}
