'use client';

import { memo } from 'react';
import { MessageBubble } from './MessageBubble';
import type { Message } from '@/types/chat';

interface StreamingMessageProps {
  message: Message;
  isLastAssistantMessage?: boolean;
}

// Memoized streaming message component
// Re-renders are controlled by MessageBubble's memo comparison
export const StreamingMessage = memo(function StreamingMessage({
  message,
  isLastAssistantMessage = false
}: StreamingMessageProps) {
  // Just render the message bubble - scroll is handled by MessageList
  // Note: Streaming messages won't show actions (isStreaming check in MessageBubble)
  // Pass empty messages array since streaming messages don't need vote functionality
  return <MessageBubble message={message} isLastAssistantMessage={isLastAssistantMessage} messages={[]} />;
});
