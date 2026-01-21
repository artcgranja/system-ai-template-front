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
  Folder,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  Loader2,
  ArrowRight,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useConversations } from '@/lib/hooks/useConversations';
import { groupConversationsByDate, truncateText } from '@/lib/utils/helpers';
import { ROUTES } from '@/config/constants';
import { cn } from '@/lib/utils';
import type { Conversation, Folder as FolderType } from '@/types/chat';
import type { OperationType } from '@/lib/stores/chatStore';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoveToFolderDialog } from './MoveToFolderDialog';

/* ============================================================================
 * CONVERSATION ITEM COMPONENT
 * ========================================================================== */

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
  isOperationLoading: (operation: OperationType, id: string) => boolean;
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
  isOperationLoading,
}: ConversationItemProps) {
  const isPinLoading = isOperationLoading('pin-conversation', conversation.id);
  const isMoveLoading = isOperationLoading('move-conversation', conversation.id);
  const isRenameLoading = isOperationLoading('rename-conversation', conversation.id);
  const isDeleteLoading = isOperationLoading('delete-conversation', conversation.id);
  const isAnyOperationLoading = isPinLoading || isMoveLoading || isRenameLoading || isDeleteLoading;
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
        'group relative flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all overflow-hidden',
        isActive ? 'bg-accent/50 text-accent-foreground' : 'hover:bg-muted/25',
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
        <span className="min-w-0 truncate">{truncateText(conversation.title, 20)}</span>
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
          <DropdownMenuItem
            onClick={() => onPin(conversation)}
            disabled={isAnyOperationLoading}
          >
            {isPinLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isPinned ? (
              <PinOff className="mr-2 h-4 w-4" />
            ) : (
              <Pin className="mr-2 h-4 w-4" />
            )}
            {isPinned ? 'Desafixar' : 'Fixar'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onMoveToFolder(conversation)}
            disabled={isAnyOperationLoading}
          >
            {isMoveLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FolderInput className="mr-2 h-4 w-4" />
            )}
            Mover para pasta
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onRename(conversation)}
            disabled={isAnyOperationLoading}
          >
            {isRenameLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="mr-2 h-4 w-4" />
            )}
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(conversation)}
            className="text-destructive"
            disabled={isAnyOperationLoading}
          >
            {isDeleteLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Deletar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ============================================================================
 * FOLDER SECTION COMPONENT
 * ========================================================================== */

interface FolderSectionProps {
  folder: FolderType;
  conversations: Conversation[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRenameFolder: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  isActive: (id: string) => boolean;
  onConversationClick: (id: string) => void;
  onRenameConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onPinConversation: (conversation: Conversation) => void;
  onMoveConversation: (conversation: Conversation) => void;
  isOperationLoading: (operation: OperationType, id: string) => boolean;
}

function FolderSection({
  folder,
  conversations,
  isExpanded,
  onToggleExpand,
  onRenameFolder,
  onDeleteFolder,
  isActive,
  onConversationClick,
  onRenameConversation,
  onDeleteConversation,
  onPinConversation,
  onMoveConversation,
  isOperationLoading,
}: FolderSectionProps) {
  // Separate pinned and unpinned
  const pinnedConversations = conversations
    .filter((c) => c.isPinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const unpinnedConversations = conversations.filter((c) => !c.isPinned);
  const groupedConversations = groupConversationsByDate(unpinnedConversations);

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      {/* Folder Header */}
      <div
        className={cn(
          'group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/25 overflow-hidden'
        )}
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 hover:bg-muted/25">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        </CollapsibleTrigger>

        <Folder
          className="h-4 w-4 shrink-0"
          style={{ color: folder.color || undefined }}
        />
        <span className="flex-1 min-w-0 truncate">{folder.name}</span>
        {conversations.length > 0 && (
          <span className="text-xs text-muted-foreground shrink-0">
            {conversations.length}
          </span>
        )}

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
            <DropdownMenuItem onClick={() => onRenameFolder(folder)}>
              <Pencil className="mr-2 h-4 w-4" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteFolder(folder)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Folder Content - Conversations */}
      <CollapsibleContent className="pl-4 space-y-2 mt-1">
        {conversations.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted-foreground">
            Nenhuma conversa nesta pasta
          </p>
        ) : (
          <>
            {/* Pinned Conversations */}
            {pinnedConversations.length > 0 && (
              <div className="space-y-1">
                <h4 className="px-2 text-xs font-semibold text-muted-foreground">
                  Fixadas
                </h4>
                <SortableContext
                  items={pinnedConversations.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {pinnedConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isActive={isActive(conversation.id)}
                      isPinned
                      onClick={() => onConversationClick(conversation.id)}
                      onRename={onRenameConversation}
                      onDelete={onDeleteConversation}
                      onPin={onPinConversation}
                      onMoveToFolder={onMoveConversation}
                      isOperationLoading={isOperationLoading}
                    />
                  ))}
                </SortableContext>
              </div>
            )}

            {/* Time-grouped Conversations */}
            {groupedConversations.map((group) => (
              <div key={group.label} className="space-y-1">
                <h4 className="px-2 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </h4>
                <SortableContext
                  items={group.conversations.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {group.conversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      isActive={isActive(conversation.id)}
                      onClick={() => onConversationClick(conversation.id)}
                      onRename={onRenameConversation}
                      onDelete={onDeleteConversation}
                      onPin={onPinConversation}
                      onMoveToFolder={onMoveConversation}
                      isOperationLoading={isOperationLoading}
                    />
                  ))}
                </SortableContext>
              </div>
            ))}
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ============================================================================
 * MAIN CONVERSATION SIDEBAR COMPONENT
 * ========================================================================== */

interface ConversationSidebarProps {
  folders: FolderType[];
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onCreateFolder: (name: string, color?: string) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  isFolderOperationLoading: (operation: OperationType, id: string) => boolean;
}

export function ConversationSidebar({
  folders,
  expandedFolders,
  onToggleFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  isFolderOperationLoading,
}: ConversationSidebarProps) {
  const {
    conversations,
    renameConversation,
    deleteConversation,
    togglePinConversation,
    moveConversationToFolder,
    isOperationLoading,
    conversationsHasMore,
  } = useConversations();
  const router = useRouter();
  const pathname = usePathname();

  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [renameConvOpen, setRenameConvOpen] = useState(false);
  const [deleteConvOpen, setDeleteConvOpen] = useState(false);
  const [moveConvOpen, setMoveConvOpen] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState<FolderType | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#6b7280');
  const [conversationTitle, setConversationTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [conversationsExpanded, setConversationsExpanded] = useState(true);

  // Organize conversations by folder
  const conversationsByFolder = (conversations || []).reduce((acc, conv) => {
    const key = conv.folderId || 'unfiled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(conv);
    return acc;
  }, {} as Record<string, Conversation[]>);

  const unfiledConversations = conversationsByFolder['unfiled'] || [];
  const pinnedUnfiled = unfiledConversations
    .filter((c) => c.isPinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const unpinnedUnfiled = unfiledConversations
    .filter((c) => !c.isPinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  // Limit to first 30 conversations for sidebar display (most recent first)
  const displayedUnpinnedUnfiled = unpinnedUnfiled.slice(0, 30);
  const hasMoreConversations = unpinnedUnfiled.length > 30;
  const groupedUnfiled = groupConversationsByDate(displayedUnpinnedUnfiled);

  const isActive = (id: string) => pathname === ROUTES.chatWithId(id);

  const handleConversationClick = (id: string) => {
    router.push(ROUTES.chatWithId(id));
  };

  // Folder handlers
  const handleCreateFolder = async () => {
    if (!folderName.trim()) return;
    await onCreateFolder(folderName, folderColor);
    setCreateFolderOpen(false);
    setFolderName('');
    setFolderColor('#6b7280');
  };

  const handleRenameFolder = async () => {
    if (!selectedFolder || !folderName.trim()) return;
    await onRenameFolder(selectedFolder.id, folderName);
    setRenameFolderOpen(false);
    setSelectedFolder(null);
    setFolderName('');
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    await onDeleteFolder(selectedFolder.id);
    setDeleteFolderOpen(false);
    setSelectedFolder(null);
  };

  const openRenameFolder = (folder: FolderType) => {
    setSelectedFolder(folder);
    setFolderName(folder.name);
    setRenameFolderOpen(true);
  };

  const openDeleteFolder = (folder: FolderType) => {
    setSelectedFolder(folder);
    setDeleteFolderOpen(true);
  };

  // Conversation handlers
  const handleRenameConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setConversationTitle(conversation.title);
    setRenameConvOpen(true);
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setDeleteConvOpen(true);
  };

  const handlePinConversation = async (conversation: Conversation) => {
    await togglePinConversation(conversation.id);
  };

  const handleMoveConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMoveConvOpen(true);
  };

  const confirmRenameConversation = async () => {
    if (selectedConversation && conversationTitle.trim()) {
      await renameConversation(selectedConversation.id, conversationTitle.trim());
      setRenameConvOpen(false);
      setSelectedConversation(null);
      setConversationTitle('');
    }
  };

  const confirmDeleteConversation = async () => {
    if (selectedConversation) {
      await deleteConversation(selectedConversation.id);
      setDeleteConvOpen(false);
      setSelectedConversation(null);

      if (pathname === ROUTES.chatWithId(selectedConversation.id)) {
        router.push(ROUTES.chat);
      }
    }
  };

  const confirmMoveConversation = async (folderId: string | null) => {
    if (selectedConversation) {
      await moveConversationToFolder(selectedConversation.id, folderId);
      setMoveConvOpen(false);
      setSelectedConversation(null);
    }
  };

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

  // Astro Steel Blue folder colors
  const folderColors = [
    '#6b7785', // Cinza (padrão)
    '#ff4242', // Vermelho
    '#ff8c42', // Laranja
    '#ffdd00', // Amarelo
    '#4F739E', // astro-500 - Astro Steel Blue
    '#6b8bb5', // astro-400 - Astro Steel Blue claro
    '#2e6cff', // Azul
    '#6e4df9', // Roxo
    '#133959', // Azul marinho
  ];

  return (
    <>
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <ScrollArea className="flex-1 h-full px-2 min-h-0 overflow-hidden">
          <div className="space-y-4 py-4">
            {/* Folders Section */}
            <Collapsible open={foldersExpanded} onOpenChange={setFoldersExpanded}>
              <div className="space-y-1">
                {/* Collapsible header */}
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex items-center gap-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 p-0 hover:bg-muted/25">
                        {foldersExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span className="sr-only">Toggle folders</span>
                      </Button>
                    </CollapsibleTrigger>
                    <h3 className="text-xs font-semibold text-muted-foreground">Pastas</h3>
                    {folders && folders.length > 0 && (
                      <span className="text-xs text-muted-foreground">({folders.length})</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-muted/25"
                    onClick={() => setCreateFolderOpen(true)}
                  >
                    <FolderPlus className="h-4 w-4" />
                    <span className="sr-only">Nova pasta</span>
                  </Button>
                </div>

                {/* Collapsible content */}
                <CollapsibleContent>
                  <div className="space-y-1 pr-3">
                    {!folders || folders.length === 0 ? (
                      <p className="px-4 py-2 text-xs text-muted-foreground">
                        Nenhuma pasta criada
                      </p>
                    ) : (
                      folders.map((folder) => (
                        <FolderSection
                          key={folder.id}
                          folder={folder}
                          conversations={conversationsByFolder[folder.id] || []}
                          isExpanded={expandedFolders.has(folder.id)}
                          onToggleExpand={() => onToggleFolder(folder.id)}
                          onRenameFolder={openRenameFolder}
                          onDeleteFolder={openDeleteFolder}
                          isActive={isActive}
                          onConversationClick={handleConversationClick}
                          onRenameConversation={handleRenameConversation}
                          onDeleteConversation={handleDeleteConversation}
                          onPinConversation={handlePinConversation}
                          onMoveConversation={handleMoveConversation}
                          isOperationLoading={isOperationLoading}
                        />
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Pinned Chats Section */}
            <Collapsible open={pinnedExpanded} onOpenChange={setPinnedExpanded}>
              <div className="space-y-1">
                {/* Collapsible header */}
                <div className="flex items-center px-2 py-1">
                  <div className="flex items-center gap-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 p-0 hover:bg-muted/25">
                        {pinnedExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span className="sr-only">Toggle pinned</span>
                      </Button>
                    </CollapsibleTrigger>
                    <h3 className="text-xs font-semibold text-muted-foreground">Fixadas</h3>
                    {pinnedUnfiled.length > 0 && (
                      <span className="text-xs text-muted-foreground">({pinnedUnfiled.length})</span>
                    )}
                  </div>
                </div>

                {/* Collapsible content */}
                <CollapsibleContent>
                  <div className="space-y-1 pr-3">
                    {pinnedUnfiled.length === 0 ? (
                      <p className="px-4 py-2 text-xs text-muted-foreground">
                        Nenhuma conversa fixada
                      </p>
                    ) : (
                      <SortableContext
                        items={pinnedUnfiled.map((c) => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {pinnedUnfiled.map((conversation) => (
                          <ConversationItem
                            key={conversation.id}
                            conversation={conversation}
                            isActive={isActive(conversation.id)}
                            isPinned
                            onClick={() => handleConversationClick(conversation.id)}
                            onRename={handleRenameConversation}
                            onDelete={handleDeleteConversation}
                            onPin={handlePinConversation}
                            onMoveToFolder={handleMoveConversation}
                            isOperationLoading={isOperationLoading}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Regular Conversations Section */}
            <Collapsible open={conversationsExpanded} onOpenChange={setConversationsExpanded}>
              <div className="space-y-1">
                {/* Collapsible header */}
                <div className="flex items-center px-2 py-1">
                  <div className="flex items-center gap-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 p-0 hover:bg-muted/25">
                        {conversationsExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span className="sr-only">Toggle conversations</span>
                      </Button>
                    </CollapsibleTrigger>
                    <h3 className="text-xs font-semibold text-muted-foreground">Conversas</h3>
                    {displayedUnpinnedUnfiled.length > 0 && (
                      <span className="text-xs text-muted-foreground">({displayedUnpinnedUnfiled.length}{hasMoreConversations ? '+' : ''})</span>
                    )}
                  </div>
                </div>

                {/* Collapsible content */}
                <CollapsibleContent>
                  <div className="space-y-2 pr-3">
                    {displayedUnpinnedUnfiled.length === 0 ? (
                      <p className="px-4 py-2 text-xs text-muted-foreground">
                        Nenhuma conversa ainda
                      </p>
                    ) : (
                      <>
                        {/* Time-grouped Conversations */}
                        {groupedUnfiled.map((group) => (
                          <div key={group.label} className="space-y-1">
                            <h4 className="px-2 text-xs font-semibold text-muted-foreground">
                              {group.label}
                            </h4>
                            <SortableContext
                              items={group.conversations.map((c) => c.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {group.conversations.map((conversation) => (
                                <ConversationItem
                                  key={conversation.id}
                                  conversation={conversation}
                                  isActive={isActive(conversation.id)}
                                  onClick={() => handleConversationClick(conversation.id)}
                                  onRename={handleRenameConversation}
                                  onDelete={handleDeleteConversation}
                                  onPin={handlePinConversation}
                                  onMoveToFolder={handleMoveConversation}
                                  isOperationLoading={isOperationLoading}
                                />
                              ))}
                            </SortableContext>
                          </div>
                        ))}
                      </>
                    )}
                    {/* See More Button - Navigate to chats page */}
                    {(hasMoreConversations || conversationsHasMore) && (
                      <div className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full hover:bg-muted/25 justify-between"
                          onClick={() => router.push(ROUTES.chats)}
                        >
                          <span>Ver mais conversas</span>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </div>
        </ScrollArea>

        <DragOverlay>
          {activeConversation && (
            <div className="rounded-lg bg-accent p-2 shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 overflow-hidden">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="text-sm min-w-0 truncate">{activeConversation.title}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
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
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
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
            <Button
              variant="outline"
              onClick={() => setCreateFolderOpen(false)}
              disabled={isFolderOperationLoading('create-folder', 'new')}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!folderName.trim() || isFolderOperationLoading('create-folder', 'new')}
            >
              {isFolderOperationLoading('create-folder', 'new') ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
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
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameFolderOpen(false)}
              disabled={selectedFolder ? isFolderOperationLoading('rename-folder', selectedFolder.id) : false}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRenameFolder}
              disabled={!folderName.trim() || (selectedFolder ? isFolderOperationLoading('rename-folder', selectedFolder.id) : false)}
            >
              {selectedFolder && isFolderOperationLoading('rename-folder', selectedFolder.id) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renomeando...
                </>
              ) : (
                'Renomear'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={deleteFolderOpen} onOpenChange={setDeleteFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Pasta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta pasta? As conversas dentro dela
              não serão excluídas.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteFolderOpen(false)}
              disabled={selectedFolder ? isFolderOperationLoading('delete-folder', selectedFolder.id) : false}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFolder}
              disabled={selectedFolder ? isFolderOperationLoading('delete-folder', selectedFolder.id) : false}
            >
              {selectedFolder && isFolderOperationLoading('delete-folder', selectedFolder.id) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Conversation Dialog */}
      <Dialog open={renameConvOpen} onOpenChange={setRenameConvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear conversa</DialogTitle>
            <DialogDescription>Digite um novo nome para a conversa</DialogDescription>
          </DialogHeader>
          <Input
            value={conversationTitle}
            onChange={(e) => setConversationTitle(e.target.value)}
            placeholder="Nome da conversa"
            onKeyDown={(e) => e.key === 'Enter' && confirmRenameConversation()}
            disabled={selectedConversation ? isOperationLoading('rename-conversation', selectedConversation.id) : false}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameConvOpen(false)}
              disabled={selectedConversation ? isOperationLoading('rename-conversation', selectedConversation.id) : false}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmRenameConversation}
              disabled={!conversationTitle.trim() || (selectedConversation ? isOperationLoading('rename-conversation', selectedConversation.id) : false)}
            >
              {selectedConversation && isOperationLoading('rename-conversation', selectedConversation.id) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Conversation Dialog */}
      <Dialog open={deleteConvOpen} onOpenChange={setDeleteConvOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar conversa</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar esta conversa? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConvOpen(false)}
              disabled={selectedConversation ? isOperationLoading('delete-conversation', selectedConversation.id) : false}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteConversation}
              disabled={selectedConversation ? isOperationLoading('delete-conversation', selectedConversation.id) : false}
            >
              {selectedConversation && isOperationLoading('delete-conversation', selectedConversation.id) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Deletar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Folder Dialog */}
      <MoveToFolderDialog
        open={moveConvOpen}
        onOpenChange={setMoveConvOpen}
        onConfirm={confirmMoveConversation}
        conversationId={selectedConversation?.id}
        isOperationLoading={isOperationLoading}
      />
    </>
  );
}
