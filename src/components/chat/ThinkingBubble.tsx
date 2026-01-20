'use client';

import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingBubbleProps {
  className?: string;
}

export function ThinkingBubble({ className }: ThinkingBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn('flex gap-3', className)}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      </div>

      {/* Thinking Indicator - simple dots without bubble */}
      <div className="flex items-center gap-1.5 py-3">
        <span
          className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary/60"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </motion.div>
  );
}
