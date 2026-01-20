'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble } from './MessageBubble';
import { StreamingMessage } from './StreamingMessage';
import { ThinkingBubble } from './ThinkingBubble';
import { ScrollToBottom } from './ScrollToBottom';
import { StreamingProgress } from './StreamingProgress';
import { ChatSkeleton } from './ChatSkeleton';
import type { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isSending?: boolean;
  onRefreshMessages?: () => Promise<void>;
}

/**
 * Check if a message ID is a valid UUID (not a temporary ID)
 * Temporary IDs have patterns like: assistant-*, user-*, temp-*
 * Valid UUIDs follow the format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * @param id Message ID to validate
 * @returns true if ID is a valid UUID, false if it's temporary
 */
function isValidMessageId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Reject temporary IDs that start with known prefixes
  if (id.startsWith('assistant-') || id.startsWith('user-') || id.startsWith('temp-')) {
    return false;
  }

  // UUID format: 8-4-4-4-12 hexadecimal characters separated by hyphens
  // Example: 550e8400-e29b-41d4-a716-446655440000
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Get IDs of consecutive assistant messages in a group
 * Finds the start of the assistant message group and collects all consecutive assistant messages
 * Groups assistant messages together until a user message or end of array is reached
 * Filters out temporary IDs - only returns valid UUIDs from the backend
 * @param messages Array of all messages
 * @param lastIndex Index of the last assistant message in the group
 * @returns Array of valid message IDs (sorted for consistency, temporary IDs filtered out)
 */
function getGroupedAssistantMessageIds(messages: Message[], lastIndex: number): string[] {
  const messageIds: string[] = [];
  
  // Find the start of the assistant message group by going backwards
  let startIndex = lastIndex;
  for (let i = lastIndex; i >= 0; i--) {
    const message = messages[i];
    
    // Stop if we encounter a user message (this marks the start of the group)
    if (message.role === 'user') {
      startIndex = i + 1;
      break;
    }
    
    // If this is an assistant message, update start index
    if (message.role === 'assistant') {
      startIndex = i;
    }
  }
  
  // Now collect all consecutive assistant messages from startIndex forward
  for (let i = startIndex; i < messages.length; i++) {
    const message = messages[i];
    
    // Stop if we encounter a user message
    if (message.role === 'user') {
      break;
    }
    
    // Only include assistant messages (skip system, tool, etc.)
    // AND filter out temporary IDs - only include valid UUIDs
    if (message.role === 'assistant' && isValidMessageId(message.id)) {
      messageIds.push(message.id);
    }
  }
  
  // Sort IDs for consistency (backend normalizes them anyway)
  return messageIds.sort();
}

export function MessageList({ messages, isLoading = false, isSending = false, onRefreshMessages }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const lastMessageCountRef = useRef(messages.length);

  // Check if any message is streaming
  const isStreaming = messages.some(m => m.isStreaming);

  // Memoize grouped message IDs to prevent unnecessary recalculations
  // Create a map of index -> messageIds for last assistant messages
  const messageIdsMap = useMemo(() => {
    const map = new Map<number, string[]>();
    messages.forEach((message, index) => {
      const isLastAssistantMessage = message.role === 'assistant' && (
        index === messages.length - 1 || 
        messages[index + 1]?.role === 'user'
      );
      if (isLastAssistantMessage && !message.isStreaming) {
        map.set(index, getGroupedAssistantMessageIds(messages, index));
      }
    });
    return map;
  }, [messages]);

  // Check if user is near bottom of scroll area
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Consider "near bottom" if within 100px
      setIsNearBottom(distanceFromBottom < 100);

      // Show scroll button when more than 300px from bottom
      setShowScrollButton(distanceFromBottom > 300);
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom only if user is near bottom or it's a new message (not an update)
  useEffect(() => {
    const isNewMessage = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    if (isNearBottom || isNewMessage) {
      // Use 'auto' during streaming for better performance, 'smooth' otherwise
      messagesEndRef.current?.scrollIntoView({
        behavior: isStreaming ? 'auto' : 'smooth'
      });
    }
  }, [messages, isNearBottom, isStreaming]);

  // Scroll to bottom function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: isStreaming ? 'auto' : 'smooth'
    });
  };

  if (isLoading && messages.length === 0) {
    return (
      <ScrollArea className="h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          <ChatSkeleton />
        </motion.div>
      </ScrollArea>
    );
  }

  return (
    <div className="relative h-full">
      {/* Streaming Progress Bar - shows when sending or streaming */}
      <StreamingProgress isStreaming={isSending || isStreaming} />

      {/* Scroll Area */}
      <ScrollArea className="h-full" ref={scrollAreaRef}>
        <div className="flex flex-col items-center">
          <div className="w-full max-w-3xl px-4 sm:px-6 py-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => {
                // Create truly stable key that never changes, even when server updates the ID
                // Uses only timestamp + role to avoid re-animation when conversationId changes from temp to real
                const timestampKey = message.timestamp instanceof Date
                  ? message.timestamp.getTime()
                  : new Date(message.timestamp).getTime();
                const stableKey = `msg-${timestampKey}-${message.role}`;

                // Determine if this is the last assistant message before a user message
                // It's the last assistant message if:
                // 1. It's an assistant message, AND
                // 2. Either it's the last message in the array, OR the next message is from a user
                const isLastAssistantMessage = message.role === 'assistant' && (
                  index === messages.length - 1 || 
                  messages[index + 1]?.role === 'user'
                );

                // Get grouped message IDs for voting (only for last assistant message)
                // Use memoized map to avoid recalculating on every render
                const messageIds = messageIdsMap.get(index);

                return (
                  <motion.div
                    key={stableKey}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      duration: 0.3,
                      delay: index === messages.length - 1 ? 0 : 0,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                  >
                    {message.isStreaming ? (
                      <StreamingMessage 
                        message={message} 
                        isLastAssistantMessage={isLastAssistantMessage}
                      />
                    ) : (
                      <MessageBubble 
                        message={message}
                        isLastAssistantMessage={isLastAssistantMessage}
                        messageIds={messageIds}
                        messages={messages}
                        onRefreshMessages={onRefreshMessages}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Thinking Indicator - shows when sending but not yet streaming */}
            <AnimatePresence>
              {isSending && !isStreaming && (
                <ThinkingBubble />
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>
      </ScrollArea>

      {/* Scroll to Bottom Button */}
      <ScrollToBottom
        onClick={scrollToBottom}
        isVisible={showScrollButton && !isNearBottom}
      />
    </div>
  );
}
