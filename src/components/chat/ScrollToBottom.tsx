'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollToBottomProps {
  onClick: () => void;
  isVisible: boolean;
  className?: string;
}

export function ScrollToBottom({ onClick, isVisible, className }: ScrollToBottomProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn('fixed bottom-24 right-6 z-50', className)}
        >
          <Button
            onClick={onClick}
            size="icon"
            className={cn(
              'h-12 w-12 rounded-full shadow-lg',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 hover:shadow-xl',
              'transition-all duration-200'
            )}
            title="Rolar para o final"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
