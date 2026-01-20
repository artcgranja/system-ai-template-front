'use client';

import React, { useMemo } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVotes } from '@/lib/hooks/useVotes';
import type { Message } from '@/types/chat';

interface VoteButtonsProps {
  messageIds: string[];
  messages: Message[];
  onVoteComplete?: () => Promise<void>;
  className?: string;
}

/**
 * Vote buttons component for message groups
 * Displays thumbs up/down buttons with current vote state and handles voting
 * Vote data is extracted from the messages themselves
 */
export function VoteButtons({ messageIds, messages, onVoteComplete, className }: VoteButtonsProps) {
  // Filter out temporary IDs before passing to hook
  // Temporary IDs have patterns like: assistant-*, user-*, temp-*
  const validMessageIds = useMemo(() => {
    if (!messageIds || messageIds.length === 0) {
      return [];
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return messageIds.filter(id => {
      // Reject temporary IDs
      if (id.startsWith('assistant-') || id.startsWith('user-') || id.startsWith('temp-')) {
        return false;
      }
      // Only accept valid UUIDs
      return uuidRegex.test(id);
    });
  }, [messageIds]);

  const { userVote, voting, handleVote, error } = useVotes(validMessageIds, messages, onVoteComplete);

  // Don't render if there are no valid message IDs
  if (!validMessageIds || validMessageIds.length === 0) {
    return null;
  }

  // Show error state (optional - could show toast instead)
  if (error) {
    console.error('Vote error:', error);
  }

  const handleThumbsUp = () => {
    handleVote('positive');
  };

  const handleThumbsDown = () => {
    handleVote('negative');
  };

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleThumbsUp}
        disabled={voting}
        className={cn(
          'h-8 w-8 p-0 hover:bg-accent/50 transition-colors',
          userVote === 'positive'
            ? 'text-green-600 dark:text-green-500'
            : 'text-[#6B7280] hover:text-foreground',
          voting && 'opacity-50 cursor-not-allowed'
        )}
        title={
          userVote === 'positive'
            ? 'Remover voto positivo'
            : 'Resposta útil'
        }
      >
        <ThumbsUp
          className={cn(
            'h-[18px] w-[18px]',
            userVote === 'positive' && 'fill-current'
          )}
        />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleThumbsDown}
        disabled={voting}
        className={cn(
          'h-8 w-8 p-0 hover:bg-accent/50 transition-colors',
          userVote === 'negative'
            ? 'text-red-600 dark:text-red-500'
            : 'text-[#6B7280] hover:text-foreground',
          voting && 'opacity-50 cursor-not-allowed'
        )}
        title={
          userVote === 'negative'
            ? 'Remover voto negativo'
            : 'Resposta não útil'
        }
      >
        <ThumbsDown
          className={cn(
            'h-[18px] w-[18px]',
            userVote === 'negative' && 'fill-current'
          )}
        />
      </Button>
    </div>
  );
}
