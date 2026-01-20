'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StreamingProgressProps {
  isStreaming: boolean;
  className?: string;
}

export function StreamingProgress({ isStreaming, className }: StreamingProgressProps) {
  if (!isStreaming) return null;

  return (
    <div className={cn('absolute top-0 left-0 right-0 h-0.5 overflow-hidden z-10', className)}>
      <motion.div
        className="h-full bg-primary"
        initial={{ x: '-100%' }}
        animate={{ x: '400%' }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{ width: '30%' }}
      />
    </div>
  );
}
