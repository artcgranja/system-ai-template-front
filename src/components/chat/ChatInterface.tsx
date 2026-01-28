'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/lib/hooks/useChat';
import { useAttachments } from '@/lib/hooks/useAttachments';
import { useQuota } from '@/lib/hooks/useQuota';
import { usePlanningTools } from '@/lib/hooks/usePlanningTools';
import { useInterrupt } from '@/lib/hooks/useInterrupt';
import { useChatStore } from '@/lib/stores/chatStore';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { QuotaModal } from '@/components/quota';
import { MessageList } from './MessageList';
import { ChatSkeleton } from './ChatSkeleton';
import { HomeScreen } from './HomeScreen';
import { InterruptCard } from './interrupt';
import { ROUTES } from '@/config/constants';
import type { MessageAttachment } from '@/types/chat';

interface ChatInterfaceProps {
  conversationId: string | null;
}

export function ChatInterface({ conversationId: initialConversationId }: ChatInterfaceProps) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const allMessages = useChatStore((state) => state.messages);

  const { isLoading, isStreaming, isSending, sendMessage, setActiveConversation, refetchMessages } = useChat(conversationId);

  // Planning tools integration
  const { activePlan, isPlanApprovalInProgress } = usePlanningTools(
    conversationId,
    async (message: string) => {
      await sendMessage(message);
    }
  );

  // Interrupt handling (LangGraph human-in-the-loop)
  const { activeInterrupt, isSubmitting: isInterruptSubmitting } = useInterrupt();

  // Wrapper for refetchMessages to match the expected type signature
  const handleRefreshMessages = useCallback(async () => {
    await refetchMessages();
  }, [refetchMessages]);

  // Quota management
  const { checkQuota, invalidateQuota, isSuspended, isExceeded } = useQuota();
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaModalType, setQuotaModalType] = useState<'exceeded' | 'suspended' | 'warning'>('exceeded');
  const [quotaWarningMessage, setQuotaWarningMessage] = useState<string | undefined>();

  // Attachment management
  const {
    pendingAttachments,
    isUploading,
    isProcessing,
    addFiles,
    removeFile,
    clearAll: clearAttachments,
    uploadAndProcess,
    retryFile,
    getValidationError,
    isAllowedFile,
    canAddMoreFiles,
  } = useAttachments();

  // Update local state when prop changes
  useEffect(() => {
    setConversationId(initialConversationId);
  }, [initialConversationId]);

  useEffect(() => {
    setActiveConversation(conversationId);
  }, [conversationId, setActiveConversation]);

  // Note: URL navigation is now handled in handleSendMessage
  // The sendMessage hook returns the real conversation ID after conversation_created
  // This eliminates the need for temp ID → real ID replacement logic

  const handleSendMessage = useCallback(async (content: string, files?: File[]) => {
    try {
      // Check if user is suspended
      if (isSuspended) {
        setQuotaModalType('suspended');
        setQuotaModalOpen(true);
        return;
      }

      // Check quota before sending
      const quotaCheck = await checkQuota();

      // Handle quota check result
      if (!quotaCheck.success) {
        // If there was an error checking quota, show exceeded modal as safety measure
        setQuotaModalType('exceeded');
        setQuotaModalOpen(true);
        return;
      }

      if (quotaCheck.data) {
        if (!quotaCheck.data.allowed) {
          setQuotaModalType('exceeded');
          setQuotaModalOpen(true);
          return;
        }

        // Show warning if nearing limit
        if (quotaCheck.data.message) {
          setQuotaWarningMessage(quotaCheck.data.message);
          setQuotaModalType('warning');
          setQuotaModalOpen(true);
          // Continue with sending - warning is just informational
        }
      }

      // If new files were passed, add them to pending attachments
      if (files && files.length > 0) {
        addFiles(files);
      }

      // Upload and process any pending attachments
      let attachmentIds: string[] = [];
      if (pendingAttachments.length > 0 || (files && files.length > 0)) {
        // Wait a tick for addFiles to update state, then upload
        await new Promise(resolve => setTimeout(resolve, 0));
        attachmentIds = await uploadAndProcess(conversationId || undefined);
      }

      // Get the current state of pending attachments after upload
      // Convert processed attachments to MessageAttachment format for optimistic UI
      const attachmentsForMessage: MessageAttachment[] = pendingAttachments
        .filter(a => a.status === 'processed' && a.serverId)
        .map(a => ({
          id: a.serverId!,
          originalFilename: a.file.name,
          mimeType: a.file.type,
          fileSizeBytes: a.file.size,
          status: 'processed' as const,
        }));

      // Send message with attachment IDs and attachment info for optimistic rendering
      // For new chats, this returns the temp ID immediately but stores a promise for the real ID
      const isNewChat = !conversationId;
      const resultConversationId = await sendMessage(
        content,
        attachmentIds.length > 0 ? attachmentIds : undefined,
        attachmentsForMessage.length > 0 ? attachmentsForMessage : undefined
      );

      // Clear attachments after successful send
      clearAttachments();

      // Invalidate quota cache after sending
      invalidateQuota();

      // If a new conversation was created, show chat immediately with temp ID
      // Then wait for the real ID to navigate (prevents double navigation)
      if (resultConversationId && isNewChat) {
        // Update local state to show chat UI immediately with temp ID
        setConversationId(resultConversationId);

        // Get the promise for the real ID and wait for it
        const { getPendingRealId, clearPendingRealId } = useChatStore.getState();
        const realIdPromise = getPendingRealId(resultConversationId);

        if (realIdPromise) {
          try {
            // Wait for the real ID from conversation_created event
            const realId = await realIdPromise;

            // Update local state with real ID (store was already updated by callback)
            setConversationId(realId);

            // Navigate to the real URL (single navigation, no replace needed)
            router.push(ROUTES.chatWithId(realId));
          } catch (error) {
            console.error('[ChatInterface] Failed to get real conversation ID:', error);
            // On error, stay on the temp ID - error message was already shown by sendMessage
          } finally {
            // Clean up the promise from the store
            clearPendingRealId(resultConversationId);
          }
        }
      }
    } catch (error) {
      console.error('[ChatInterface] Failed to send message with attachments:', error);
      // Don't clear attachments on error so user can retry
    }
  }, [isSuspended, checkQuota, addFiles, pendingAttachments, uploadAndProcess, conversationId, sendMessage, clearAttachments, invalidateQuota, router]);

  // Home Screen: Show when no conversationId
  if (!conversationId) {
    return (
      <HomeScreen
        onSendMessage={handleSendMessage}
        isLoading={isSending || isStreaming || isLoading || isUploading || isProcessing}
        pendingAttachments={pendingAttachments}
        onAddFiles={addFiles}
        onRemoveFile={removeFile}
        onRetryFile={retryFile}
        isUploading={isUploading}
        isProcessing={isProcessing}
        getValidationError={getValidationError}
        isAllowedFile={isAllowedFile}
        canAddMoreFiles={canAddMoreFiles}
      />
    );
  }

  // Chat Screen: Show for existing conversations
  const activeMessages = allMessages[conversationId] || [];
  const isPlanAwaitingApproval = activePlan?.status === 'pending_approval';
  const hasActiveInterrupt = activeInterrupt.active;
  const isInputDisabled = isSending || isStreaming || isLoading || isUploading || isProcessing || isSuspended || isExceeded || isPlanApprovalInProgress || isPlanAwaitingApproval || hasActiveInterrupt || isInterruptSubmitting;

  // Show skeleton during initial conversation load (no messages yet and loading)
  const showInitialSkeleton = isLoading && activeMessages.length === 0;

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          {showInitialSkeleton ? (
            <div className="flex h-full items-center justify-center">
              <ChatSkeleton />
            </div>
          ) : (
            <MessageList
              messages={activeMessages}
              isLoading={isLoading}
              isSending={isSending}
              onRefreshMessages={handleRefreshMessages}
            />
          )}
        </div>

        {/* Input Area - Animates between Input Box and Interrupt Card */}
        <div className="bg-background">
          <div className="container mx-auto max-w-4xl p-4">
            <AnimatePresence mode="wait">
              {hasActiveInterrupt ? (
                <motion.div
                  key="interrupt"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                >
                  <InterruptCard />
                </motion.div>
              ) : (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  <PromptInputBox
                    onSend={handleSendMessage}
                    isLoading={isInputDisabled}
                    placeholder={
                      isPlanApprovalInProgress
                        ? "Processando resposta do plano..."
                        : isPlanAwaitingApproval
                          ? "Aguardando aprovacao do plano..."
                          : isSuspended
                            ? "Conta suspensa - entre em contato com o administrador"
                            : isExceeded
                              ? "Cota excedida - aguarde o reset da sua cota"
                              : "Digite sua mensagem..."
                    }
                    pendingAttachments={pendingAttachments}
                    onAddFiles={addFiles}
                    onRemoveFile={removeFile}
                    onRetryFile={retryFile}
                    isUploading={isUploading}
                    isProcessing={isProcessing}
                    getValidationError={getValidationError}
                    isAllowedFile={isAllowedFile}
                    canAddMoreFiles={canAddMoreFiles}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Quota Modal */}
      <QuotaModal
        open={quotaModalOpen}
        onClose={() => setQuotaModalOpen(false)}
        type={quotaModalType}
        warningMessage={quotaWarningMessage}
      />
    </>
  );
}
