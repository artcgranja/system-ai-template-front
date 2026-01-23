'use client';

import { memo, useMemo } from 'react';
import type { Message, MessageAttachment } from '@/types/chat';
import { cn } from '@/lib/utils';
import { deriveContentBlocks, hasContentBlocks } from '@/lib/utils/contentBlocks';
import { StreamingMarkdown } from './StreamingMarkdown';
import { MessageActions } from './MessageActions';
import { TypingIndicator } from './TypingIndicator';
import { ToolCallIndicator } from './ToolCallIndicator';
import { ToolCallResult } from './ToolCallResult';
import { FileText, FileSpreadsheet, FileImage, File as FileIcon } from 'lucide-react';

// Helper to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Get appropriate icon for file type
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return FileSpreadsheet;
  if (mimeType.includes('document') || mimeType.includes('word')) return FileText;
  return FileIcon;
}

// Attachment preview component
function AttachmentPreview({ attachments, isUser }: { attachments: MessageAttachment[]; isUser: boolean }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className={cn(
      "flex flex-wrap gap-2 mb-2",
      isUser ? "justify-end" : "justify-start"
    )}>
      {attachments.map((attachment) => {
        const IconComponent = getFileIcon(attachment.mimeType);
        const isImage = attachment.mimeType.startsWith('image/');

        return (
          <div
            key={attachment.id}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 max-w-[200px]",
              isUser
                ? "bg-muted/70"
                : "bg-secondary/50"
            )}
          >
            <IconComponent className={cn(
              "h-4 w-4 flex-shrink-0",
              isImage ? "text-blue-500" : "text-primary"
            )} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate text-foreground" title={attachment.originalFilename}>
                {attachment.originalFilename}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatFileSize(attachment.fileSizeBytes)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  isLastAssistantMessage?: boolean;
  messageIds?: string[];
  messages: Message[];
  onRefreshMessages?: () => Promise<void>;
}

// Custom comparison function for MessageBubble memo
// Only re-render when relevant props change
function areMessageBubblePropsEqual(
  prevProps: MessageBubbleProps,
  nextProps: MessageBubbleProps
): boolean {
  // Always re-render if message id changes
  if (prevProps.message.id !== nextProps.message.id) return false;

  // Re-render if content changes (streaming updates)
  if (prevProps.message.content !== nextProps.message.content) return false;

  // Re-render if streaming status changes
  if (prevProps.message.isStreaming !== nextProps.message.isStreaming) return false;

  // Re-render if tool calls change
  const prevToolCallsLength = prevProps.message.toolCalls?.length ?? 0;
  const nextToolCallsLength = nextProps.message.toolCalls?.length ?? 0;
  if (prevToolCallsLength !== nextToolCallsLength) return false;

  // Check if any tool call status changed
  if (prevProps.message.toolCalls && nextProps.message.toolCalls) {
    for (let i = 0; i < prevToolCallsLength; i++) {
      if (prevProps.message.toolCalls[i]?.status !== nextProps.message.toolCalls[i]?.status) return false;
      if (prevProps.message.toolCalls[i]?.streamingContent !== nextProps.message.toolCalls[i]?.streamingContent) return false;
      if (prevProps.message.toolCalls[i]?.result !== nextProps.message.toolCalls[i]?.result) return false;
    }
  }

  // Re-render if contentBlockRefs change (derived contentBlocks will differ)
  const prevRefsLength = prevProps.message.contentBlockRefs?.length ?? 0;
  const nextRefsLength = nextProps.message.contentBlockRefs?.length ?? 0;
  if (prevRefsLength !== nextRefsLength) return false;

  // Re-render if isLastAssistantMessage changes (affects vote buttons visibility)
  if (prevProps.isLastAssistantMessage !== nextProps.isLastAssistantMessage) return false;

  // Props are equal, skip re-render
  return true;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onRegenerate,
  isLastAssistantMessage = false,
  messageIds,
  messages,
  onRefreshMessages,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Derive contentBlocks from contentBlockRefs + toolCalls (single source of truth pattern)
  // This combines the order info from refs with current tool call data
  // Using message as dependency since we access multiple properties
  const contentBlocks = useMemo(
    () => deriveContentBlocks(message),
    [message]
  );
  const hasBlocks = hasContentBlocks(message);

  return (
    <div
      className={cn(
        'group relative w-full transition-colors duration-200',
        isUser ? 'flex justify-end' : 'flex justify-start'
      )}
    >
      {isUser ? (
        // User message - Right-aligned with background
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%]">
          {/* Attachments shown above message content */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentPreview attachments={message.attachments} isUser={true} />
          )}
          <div
            className={cn(
              'rounded-xl px-4 py-3',
              'bg-muted',
              'text-foreground',
              'shadow-sm'
            )}
          >
            <p className="whitespace-pre-wrap text-[15px] leading-[1.75]">
              {message.content}
            </p>
          </div>
        </div>
      ) : (
        // Assistant message - Left-aligned without avatar or name
        <div className="flex w-full">
          {/* Message Content */}
          <div className="flex-1 space-y-2 overflow-hidden min-w-0">
            {/* Render markdown when there are no content blocks */}
            {!hasBlocks ? (
              <div className="rounded-xl px-4 py-3 bg-transparent dark:bg-transparent relative">
                {/* Typing indicator - positioned inside message box */}
                {message.isStreaming && (
                  <div className="absolute top-3 right-3 z-10">
                    <TypingIndicator />
                  </div>
                )}
                <StreamingMarkdown
                  content={message.content}
                  isStreaming={message.isStreaming}
                />
              </div>
            ) : null}

            {/* Content Blocks - Show text and tool calls in order (derived from contentBlockRefs + toolCalls) */}
            {isAssistant && hasBlocks ? (
              <div className="space-y-2">
                {contentBlocks.map((block, index) => {
                  if (block.type === 'text') {
                    return (
                      <div key={`text-${index}`} className="rounded-xl px-4 py-3 bg-transparent dark:bg-transparent">
                        <StreamingMarkdown
                          content={block.content}
                          isStreaming={false}
                        />
                      </div>
                    );
                  } else if (block.type === 'tool_call') {
                    const toolCall = block.toolCall;
                    // Show indicator for running/starting tools
                    if (toolCall.status === 'running' || toolCall.status === 'starting') {
                      return (
                        <ToolCallIndicator key={`tool-${index}`} toolCall={toolCall} />
                      );
                    }
                    // Show result for completed/error tools
                    if (toolCall.status === 'completed' || toolCall.status === 'error') {
                      return (
                        <ToolCallResult key={`tool-${index}`} toolCall={toolCall} />
                      );
                    }
                  }
                  return null;
                })}

                {/* Show streaming text that hasn't been added to contentBlockRefs yet */}
                {message.isStreaming && message.content && (() => {
                  // Calculate how much content is already committed to contentBlockRefs (only text blocks)
                  // This gives us the total length of text that's been saved as blocks
                  const contentBlocksText = contentBlocks
                    .filter((block): block is { type: 'text'; content: string } => block.type === 'text')
                    .map(block => block.content)
                    .join('');

                  // Get the remaining text that's being streamed but not committed to blocks yet
                  // This handles text that arrives after tool calls or before text_block_complete
                  // We compare lengths to avoid showing text that's already in contentBlocks
                  const committedTextLength = contentBlocksText.length;
                  const totalContentLength = message.content.length;
                  
                  // Only show streaming text if there's more content than what's committed
                  const streamingText = totalContentLength > committedTextLength
                    ? message.content.slice(committedTextLength)
                    : '';

                  // Only render if there's new streaming content that's not already in blocks
                  if (streamingText && streamingText.trim().length > 0) {
                    return (
                      <div key="streaming-text" className="rounded-xl px-4 py-3 bg-transparent dark:bg-transparent relative">
                        {/* Typing indicator for streaming text */}
                        <div className="absolute top-3 right-3 z-10">
                          <TypingIndicator />
                        </div>
                        <StreamingMarkdown
                          content={streamingText}
                          isStreaming={true}
                        />
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : (
              /* Fallback: Old behavior - show tool calls at the end */
              isAssistant && message.toolCalls && message.toolCalls.length > 0 && (
                <div className="space-y-2 mt-3">
                  {message.toolCalls.map((toolCall) => {
                    if (toolCall.status === 'running' || toolCall.status === 'starting') {
                      return (
                        <ToolCallIndicator key={toolCall.id} toolCall={toolCall} />
                      );
                    }
                    if (toolCall.status === 'completed' || toolCall.status === 'error') {
                      return (
                        <ToolCallResult key={toolCall.id} toolCall={toolCall} />
                      );
                    }
                    return null;
                  })}
                </div>
              )
            )}

            {/* Message Actions - Only visible on last assistant message before user message */}
            {isAssistant && !message.isStreaming && isLastAssistantMessage && (
              <MessageActions
                content={message.content}
                onRegenerate={onRegenerate}
                messageIds={messageIds}
                messages={messages}
                onRefreshMessages={onRefreshMessages}
              />
            )}

          </div>
        </div>
      )}
    </div>
  );
}, areMessageBubblePropsEqual);
