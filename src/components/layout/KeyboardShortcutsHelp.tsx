'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KEYBOARD_SHORTCUTS, getShortcutLabel } from '@/lib/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  const shortcuts = [
    {
      category: 'Navegação',
      items: [
        {
          keys: getShortcutLabel(KEYBOARD_SHORTCUTS.SEARCH),
          description: KEYBOARD_SHORTCUTS.SEARCH.description,
        },
        {
          keys: getShortcutLabel(KEYBOARD_SHORTCUTS.NEW_CHAT),
          description: KEYBOARD_SHORTCUTS.NEW_CHAT.description,
        },
        {
          keys: getShortcutLabel(KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR),
          description: KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR.description,
        },
      ],
    },
    {
      category: 'Ajuda',
      items: [
        {
          keys: getShortcutLabel(KEYBOARD_SHORTCUTS.HELP),
          description: KEYBOARD_SHORTCUTS.HELP.description,
        },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atalhos de Teclado</DialogTitle>
          <DialogDescription>
            Use esses atalhos para navegar rapidamente no América IA
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                {section.category}
              </h3>
              <div className="space-y-2">
                {section.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <span className="text-sm">{item.description}</span>
                    <kbd className="pointer-events-none inline-flex h-7 select-none items-center gap-1 rounded border bg-muted px-2 font-mono text-sm font-medium text-muted-foreground">
                      {item.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>
            💡 Dica: Pressione <kbd className="inline-flex h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px]">ESC</kbd> para fechar qualquer diálogo
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
