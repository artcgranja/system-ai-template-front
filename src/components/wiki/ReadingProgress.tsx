'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ReadingProgressProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

/**
 * Reading progress indicator bar
 * Shows how much of the document has been read based on scroll position
 */
export function ReadingProgress({ containerRef, className }: ReadingProgressProps) {
  const [progress, setProgress] = useState(0);

  const calculateProgress = useCallback(() => {
    let scrollTop: number;
    let scrollHeight: number;
    let clientHeight: number;

    if (containerRef?.current) {
      // Use container element
      scrollTop = containerRef.current.scrollTop;
      scrollHeight = containerRef.current.scrollHeight;
      clientHeight = containerRef.current.clientHeight;
    } else {
      // Use window/document
      scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = document.documentElement.clientHeight;
    }

    const totalScrollable = scrollHeight - clientHeight;

    if (totalScrollable <= 0) {
      setProgress(0);
      return;
    }

    const currentProgress = Math.min(Math.max((scrollTop / totalScrollable) * 100, 0), 100);
    setProgress(currentProgress);
  }, [containerRef]);

  useEffect(() => {
    // Throttle scroll events using requestAnimationFrame
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          calculateProgress();
          ticking = false;
        });
        ticking = true;
      }
    };

    const target = containerRef?.current || window;
    target.addEventListener('scroll', handleScroll, { passive: true });

    // Calculate initial progress
    calculateProgress();

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, calculateProgress]);

  return (
    <div
      className={cn(
        'fixed top-0 left-0 z-50 h-1 bg-primary transition-all duration-150 ease-out',
        className
      )}
      style={{ width: `${progress}%` }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progresso de leitura"
    />
  );
}
