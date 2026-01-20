'use client';

import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatPlusButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'floating' | 'sidebar';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Prominent Chat+ button component with smooth animations
 * Inspired by Anthropic Claude's chat initiation design
 */
export function ChatPlusButton({
  onClick,
  className,
  variant = 'default',
  size = 'md',
}: ChatPlusButtonProps) {
  const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  if (variant === 'floating') {
    return (
      <motion.div
        className={cn('fixed bottom-6 right-6 z-50', className)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={onClick}
          size="icon"
          className={cn(
            'rounded-full shadow-lg hover:shadow-xl transition-shadow',
            sizeClasses[size],
            'bg-primary hover:bg-primary/90'
          )}
          aria-label="Nova conversa"
        >
          <Plus className={cn(iconSizes[size])} />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Button
        onClick={onClick}
        variant={variant === 'sidebar' ? 'ghost' : 'default'}
        size="icon"
        className={cn(
          'rounded-full transition-all',
          sizeClasses[size],
          variant === 'sidebar' && 'hover:bg-muted/25',
          className
        )}
        aria-label="Nova conversa"
      >
        <Plus className={cn(iconSizes[size])} />
      </Button>
    </motion.div>
  );
}

