import { useEffect } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
};

export const KEYBOARD_SHORTCUTS = {
  SEARCH: {
    key: 'k',
    ctrl: true,
    meta: true,
    description: 'Ir para página de conversas',
  },
  NEW_CHAT: {
    key: 'o',
    ctrl: true,
    shift: true,
    meta: true,
    description: 'Nova conversa',
  },
  TOGGLE_SIDEBAR: {
    key: 's',
    ctrl: true,
    shift: true,
    meta: true,
    description: 'Mostrar/ocultar barra lateral',
  },
  HELP: {
    key: '?',
    shift: true,
    description: 'Mostrar atalhos',
  },
} as const;

interface UseKeyboardShortcutsProps {
  onSearch?: () => void;
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
  onHelp?: () => void;
  enabled?: boolean;
  navigateToChats?: () => void;
}

export function useKeyboardShortcuts({
  onSearch,
  onNewChat,
  onToggleSidebar,
  onHelp,
  enabled = true,
  navigateToChats,
}: UseKeyboardShortcutsProps = {}) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Allow Ctrl+K or Cmd+K to navigate to chats page even in inputs
        if (event.key === 'k' && cmdOrCtrl && navigateToChats) {
          event.preventDefault();
          navigateToChats();
        }
        return;
      }

      // Ctrl/Cmd + K - Navigate to chats page (replaces modal search)
      if (event.key === 'k' && cmdOrCtrl && !event.shiftKey) {
        event.preventDefault();
        if (navigateToChats) {
          navigateToChats();
        } else if (onSearch) {
          // Fallback to old behavior if navigateToChats not provided
          onSearch();
        }
      }

      // Ctrl/Cmd + Shift + O - New chat
      if (
        event.key === 'o' &&
        cmdOrCtrl &&
        event.shiftKey &&
        onNewChat
      ) {
        event.preventDefault();
        onNewChat();
      }

      // Ctrl/Cmd + Shift + S - Toggle sidebar
      if (
        event.key === 's' &&
        cmdOrCtrl &&
        event.shiftKey &&
        onToggleSidebar
      ) {
        event.preventDefault();
        onToggleSidebar();
      }

      // Shift + ? - Show help
      if (event.key === '?' && event.shiftKey && onHelp) {
        event.preventDefault();
        onHelp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearch, onNewChat, onToggleSidebar, onHelp, enabled, navigateToChats]);
}

export function getShortcutLabel(
  shortcut: typeof KEYBOARD_SHORTCUTS[keyof typeof KEYBOARD_SHORTCUTS]
): string {
  const isMac = typeof window !== 'undefined'
    ? navigator.platform.toUpperCase().indexOf('MAC') >= 0
    : false;

  const parts: string[] = [];

  if ('ctrl' in shortcut && shortcut.ctrl || 'meta' in shortcut && shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }

  if ('shift' in shortcut && shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }

  if ('alt' in shortcut && shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}
