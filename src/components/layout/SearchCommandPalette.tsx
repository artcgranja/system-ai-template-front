'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { MessageSquare, Search, Pin } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Conversation } from '@/types/chat';
import { ROUTES } from '@/config/constants';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SearchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: Conversation[];
}

export function SearchCommandPalette({
  open,
  onOpenChange,
  conversations,
}: SearchCommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleSelectConversation = (conversationId: string) => {
    router.push(ROUTES.chatWithId(conversationId));
    onOpenChange(false);
  };

  // Group conversations - show all conversations, not just recent ones
  const pinnedConversations = conversations.filter((c) => c.isPinned);
  const recentConversations = conversations
    .filter((c) => !c.isPinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-2xl max-h-[90vh] flex flex-col overflow-hidden bg-popover">
        <DialogTitle className="sr-only">Buscar conversas</DialogTitle>
        <Command className="rounded-lg border-none shadow-md flex flex-col h-full overflow-hidden bg-popover text-popover-foreground">
          <div className="flex items-center border-b border-border px-3 shrink-0">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="Buscar conversas..."
              value={search}
              onValueChange={setSearch}
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <Command.List className="flex-1 min-h-0 overflow-y-auto p-2 max-h-[calc(90vh-120px)]">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa encontrada.
            </Command.Empty>

            {pinnedConversations.length > 0 && (
              <Command.Group
                heading="Fixadas"
                className="text-xs font-semibold text-muted-foreground px-2 py-1.5"
              >
                {pinnedConversations.map((conversation) => (
                  <Command.Item
                    key={conversation.id}
                    value={`${conversation.id} ${conversation.title} ${conversation.lastMessage}`}
                    onSelect={() => handleSelectConversation(conversation.id)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2.5 overflow-hidden',
                      'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      'hover:bg-accent hover:text-accent-foreground',
                      'transition-colors outline-none'
                    )}
                  >
                    <Pin className="h-4 w-4 shrink-0 text-primary" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="font-medium truncate">{conversation.title}</div>
                      {conversation.lastMessage && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
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
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {recentConversations.length > 0 && (
              <Command.Group
                heading="Recentes"
                className="text-xs font-semibold text-muted-foreground px-2 py-1.5"
              >
                {recentConversations.map((conversation) => (
                  <Command.Item
                    key={conversation.id}
                    value={`${conversation.id} ${conversation.title} ${conversation.lastMessage}`}
                    onSelect={() => handleSelectConversation(conversation.id)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-2.5 overflow-hidden',
                      'aria-selected:bg-accent aria-selected:text-accent-foreground',
                      'hover:bg-accent hover:text-accent-foreground',
                      'transition-colors outline-none'
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="font-medium truncate">{conversation.title}</div>
                      {conversation.lastMessage && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
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
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="border-t px-3 py-2 text-xs text-muted-foreground flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ↵
              </kbd>
              <span>para abrir</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ESC
              </kbd>
              <span>para fechar</span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
