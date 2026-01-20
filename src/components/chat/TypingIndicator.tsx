'use client';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
  showText?: boolean;
}

export function TypingIndicator({ className, showText = false }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        <span
          className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      {showText && (
        <span className="text-xs text-muted-foreground">
          Gerando resposta...
        </span>
      )}
    </div>
  );
}
