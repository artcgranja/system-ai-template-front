'use client';

import { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface ChatSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Embedded search bar component for chats page
 * No modal wrapper - designed to be part of the page layout
 */
export function ChatSearchBar({
  value,
  onChange,
  placeholder = 'Buscar conversas...',
  autoFocus = false,
  className,
}: ChatSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('relative', className)}
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full pl-9 pr-4 h-12 text-base',
            'border border-input bg-background',
            'focus-visible:outline-none focus-visible:ring-0',
            'transition-all duration-200'
          )}
          aria-label="Buscar conversas"
          role="searchbox"
          aria-autocomplete="list"
        />
      </div>
    </motion.div>
  );
}

