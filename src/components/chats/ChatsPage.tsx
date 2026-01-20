'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, MessageSquarePlus, MoreVertical, Pencil, Trash2, Pin, PinOff, FolderInput, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
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
import { useConversations } from '@/lib/hooks/useConversations';
import { groupConversationsByDate } from '@/lib/utils/helpers';
import { ROUTES } from '@/config/constants';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/chat';
import type { OperationType } from '@/lib/stores/chatStore';
import { ChatSearchBar } from './ChatSearchBar';
import { MoveToFolderDialog } from '@/components/layout/MoveToFolderDialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatListItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  onPin: (conversation: Conversation) => void;
  onMoveToFolder: (conversation: Conversation) => void;
  isOperationLoading: (operation: OperationType, id: string) => boolean;
}

function ChatListItem({
  conversation,
  isActive,
  onClick,
  onRename,
  onDelete,
  onPin,
  onMoveToFolder,
  isOperationLoading,
}: ChatListItemProps) {
  const isPinLoading = isOperationLoading('pin-conversation', conversation.id);
  const isMoveLoading = isOperationLoading('move-conversation', conversation.id);
  const isRenameLoading = isOperationLoading('rename-conversation', conversation.id);
  const isDeleteLoading = isOperationLoading('delete-conversation', conversation.id);
  const isAnyOperationLoading = isPinLoading || isMoveLoading || isRenameLoading || isDeleteLoading;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'w-full cursor-pointer transition-all duration-150',
          'hover:shadow-md hover:border-primary/20',
          isActive && 'border-primary shadow-md'
        )}
        onClick={onClick}
      >
        <div
          className={cn(
            'group flex items-center gap-3 px-4 py-4 rounded-lg transition-all',
            isActive ? 'bg-accent/50 text-accent-foreground' : 'hover:bg-muted/25'
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{conversation.title}</div>
            {conversation.lastMessage && (
              <div className="text-sm text-muted-foreground truncate mt-1">
                {conversation.lastMessage}
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(conversation.updatedAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onPin(conversation);
                }}
                disabled={isAnyOperationLoading}
              >
                {isPinLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : conversation.isPinned ? (
                  <PinOff className="mr-2 h-4 w-4" />
                ) : (
                  <Pin className="mr-2 h-4 w-4" />
                )}
                {conversation.isPinned ? 'Desafixar' : 'Fixar'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToFolder(conversation);
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onRename(conversation);
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conversation);
                }}
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
      </Card>
    </motion.div>
  );
}


interface ChatsPageProps {
  autoFocusSearch?: boolean;
}

/**
 * Main chats page component with embedded search and chat list
 * Replaces the modal search with a dedicated page experience
 */
export function ChatsPage({ autoFocusSearch = false }: ChatsPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    conversations,
    renameConversation,
    deleteConversation,
    togglePinConversation,
    moveConversationToFolder,
    isOperationLoading,
    loadMoreConversations,
    conversationsHasMore,
    isLoadingMoreConversations,
  } = useConversations();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationTitle, setConversationTitle] = useState('');

  // Filter conversations based on search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) {
      return conversations || [];
    }

    const query = searchQuery.toLowerCase();
    return (conversations || []).filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.lastMessage?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  // Group all conversations by date (no folders, no pinned separation)
  const groupedConversations = groupConversationsByDate(
    filteredConversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  );

  const isActive = (id: string) => pathname === ROUTES.chatWithId(id);

  const handleConversationClick = (id: string) => {
    router.push(ROUTES.chatWithId(id));
  };

  const handleNewChat = () => {
    router.push(ROUTES.chat);
  };

  // Conversation handlers
  const handleRenameConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setConversationTitle(conversation.title);
    setRenameDialogOpen(true);
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setDeleteDialogOpen(true);
  };

  const handlePinConversation = async (conversation: Conversation) => {
    await togglePinConversation(conversation.id);
  };

  const handleMoveConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMoveDialogOpen(true);
  };

  const confirmRenameConversation = async () => {
    if (selectedConversation && conversationTitle.trim()) {
      await renameConversation(selectedConversation.id, conversationTitle.trim());
      setRenameDialogOpen(false);
      setSelectedConversation(null);
      setConversationTitle('');
    }
  };

  const confirmDeleteConversation = async () => {
    if (selectedConversation) {
      await deleteConversation(selectedConversation.id);
      setDeleteDialogOpen(false);
      setSelectedConversation(null);

      if (pathname === ROUTES.chatWithId(selectedConversation.id)) {
        router.push(ROUTES.chat);
      }
    }
  };

  const confirmMoveConversation = async (folderId: string | null) => {
    if (selectedConversation) {
      await moveConversationToFolder(selectedConversation.id, folderId);
      setMoveDialogOpen(false);
      setSelectedConversation(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with Search */}
      <div className="shrink-0 bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Conversas</h1>
            <Button
              variant="outline"
              className="gap-2 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/20 dark:hover:text-foreground dark:hover:border-accent/30 transition-all duration-200"
              onClick={handleNewChat}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Nova Conversa
            </Button>
          </div>
          <ChatSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            autoFocus={autoFocusSearch}
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Conversations Grouped by Date */}
            {groupedConversations.length > 0 ? (
              <>
                {groupedConversations.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground px-2">
                      {group.label}
                    </h2>
                    <div className="space-y-3">
                      {group.conversations.map((conversation, index) => (
                        <motion.div
                          key={conversation.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <ChatListItem
                            conversation={conversation}
                            isActive={isActive(conversation.id)}
                            onClick={() => handleConversationClick(conversation.id)}
                            onRename={handleRenameConversation}
                            onDelete={handleDeleteConversation}
                            onPin={handlePinConversation}
                            onMoveToFolder={handleMoveConversation}
                            isOperationLoading={isOperationLoading}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
                {/* Load More Button */}
                {conversationsHasMore && !searchQuery && (
                  <div className="pt-4 pb-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={loadMoreConversations}
                      disabled={isLoadingMoreConversations}
                    >
                      {isLoadingMoreConversations ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        'Carregar mais conversas'
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : filteredConversations.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? 'Nenhuma conversa encontrada'
                    : 'Nenhuma conversa ainda'}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={handleNewChat}
                    className="mt-4 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/20 dark:hover:text-foreground dark:hover:border-accent/30 transition-all duration-200"
                    variant="outline"
                  >
                    Criar primeira conversa
                  </Button>
                )}
              </div>
            ) : null}
          </motion.div>
        </div>
      </ScrollArea>

      {/* Rename Conversation Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
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
              onClick={() => setRenameDialogOpen(false)}
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              onClick={() => setDeleteDialogOpen(false)}
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
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        onConfirm={confirmMoveConversation}
        conversationId={selectedConversation?.id}
        isOperationLoading={isOperationLoading}
      />
    </div>
  );
}

