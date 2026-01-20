'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { X, PanelLeftClose, PanelLeft, MessageSquarePlus, MessagesSquare } from 'lucide-react';
import Image from 'next/image';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarFooter } from './SidebarFooter';
import { ConversationSidebarSkeleton } from './ConversationSidebarSkeleton';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { QuotaBar } from '@/components/quota';
import { useFolders } from '@/lib/hooks/useFolders';
import { useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcuts';
import { useChatStore } from '@/lib/stores/chatStore';
import { useRouter } from 'next/navigation';
import { ROUTES, SUPABASE_STORAGE_URL } from '@/config/constants';
import { cn } from '@/lib/utils';

// Lazy load ConversationSidebar - heavy component with DnD and multiple dialogs
const ConversationSidebar = dynamic(
  () => import('./ConversationSidebar').then(mod => ({ default: mod.ConversationSidebar })),
  {
    loading: () => <ConversationSidebarSkeleton />,
    ssr: false,
  }
);

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const { createFolder, updateFolder, deleteFolder, isOperationLoading: isFolderOperationLoading } = useFolders();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar, folders } = useChatStore(
    useShallow((state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      toggleSidebar: state.toggleSidebar,
      folders: state.folders,
    }))
  );

  // Local UI state
  const [helpOpen, setHelpOpen] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Keyboard shortcuts
  useKeyboardShortcuts({
    navigateToChats: () => router.push(`${ROUTES.chats}?focus=true`),
    onNewChat: handleNewChat,
    onToggleSidebar: toggleSidebar,
    onHelp: () => setHelpOpen(true),
  });

  function handleNewChat() {
    // Navigate to new chat page - conversation will be created when user sends first message
    router.push(ROUTES.chat);
    onClose?.();
  }

  function handleNavigateToChats() {
    router.push(`${ROUTES.chats}?focus=true`);
    onClose?.();
  }

  const handleToggleSidebar = () => {
    toggleSidebar();
  };

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Folder functions with real API calls
  const handleCreateFolder = async (name: string, color?: string) => {
    await createFolder(name, color);
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    await updateFolder(folderId, { name: newName });
  };

  const handleDeleteFolder = async (folderId: string) => {
    await deleteFolder(folderId);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground transition-all duration-300 md:relative md:translate-x-0 overflow-hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          {!sidebarCollapsed && (
            <Image
              src={`${SUPABASE_STORAGE_URL}/logo-vora-verde-branco.png`}
              alt="VORA Energia"
              width={140}
              height={32}
              className="h-8 w-auto"
            />
          )}

          <div className="flex-1" />

          {/* Collapse toggle for desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden md:flex hover:bg-muted/25"
            onClick={handleToggleSidebar}
            title={sidebarCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
            <span className="sr-only">
              {sidebarCollapsed ? 'Expandir' : 'Recolher'}
            </span>
          </Button>

          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden hover:bg-muted/25"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        {/* Collapsed state - icon only */}
        {sidebarCollapsed ? (
          <>
            <div className="flex flex-col items-center gap-2 py-3">
              {/* New Chat Icon */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-muted/25"
                onClick={handleNewChat}
                title="Nova Conversa (Ctrl+Shift+O)"
              >
                <MessageSquarePlus className="h-5 w-5" />
                <span className="sr-only">Nova Conversa</span>
              </Button>

              {/* Chats Icon */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-muted/25"
                onClick={handleNavigateToChats}
                title="Chats (Ctrl+K)"
              >
                <MessagesSquare className="h-5 w-5" />
                <span className="sr-only">Chats</span>
              </Button>
            </div>

            {/* Spacer to push footer to bottom */}
            <div className="flex-1" />
          </>
        ) : (
          <>
            {/* Expanded state - full content */}
            {/* New Chat Button */}
            <div className="p-3">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-sidebar-foreground hover:text-sidebar-foreground hover:bg-muted/25"
                onClick={handleNewChat}
              >
                <MessageSquarePlus className="h-4 w-4" />
                Nova Conversa
              </Button>
            </div>

            {/* Chats Button */}
            <div className="px-3 pb-3">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/25"
                onClick={handleNavigateToChats}
              >
                <MessagesSquare className="h-4 w-4" />
                <span className="flex-1 text-left">Chats</span>
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-sidebar-border bg-sidebar-border/30 text-sidebar-foreground px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  ⌘K
                </kbd>
              </Button>
            </div>

            <Separator />

            {/* Conversation Sidebar - Folders + Chats */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <ConversationSidebar
                folders={folders}
                expandedFolders={expandedFolders}
                onToggleFolder={handleToggleFolder}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                isFolderOperationLoading={isFolderOperationLoading}
              />
            </div>

          </>
        )}

        {/* Quota Bar */}
        <div className={cn('shrink-0 border-t border-sidebar-border', sidebarCollapsed ? 'p-2' : 'px-4 py-3')}>
          <QuotaBar collapsed={sidebarCollapsed} showLabel={!sidebarCollapsed} />
        </div>

        {/* User Footer - always rendered */}
        <div className="shrink-0">
          <SidebarFooter collapsed={sidebarCollapsed} onOpenHelp={() => setHelpOpen(true)} />
        </div>
      </aside>

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
