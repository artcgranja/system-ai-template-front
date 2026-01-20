'use client';

import { motion } from 'framer-motion';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { SuggestedPrompts } from './SuggestedPrompts';
import type { PendingAttachment } from '@/types/attachment';

interface HomeScreenProps {
  onSendMessage: (content: string, files?: File[]) => void;
  isLoading: boolean;
  // Attachment props (optional for backward compatibility)
  pendingAttachments?: PendingAttachment[];
  onAddFiles?: (files: File[]) => void;
  onRemoveFile?: (id: string) => void;
  onRetryFile?: (id: string) => void;
  isUploading?: boolean;
  isProcessing?: boolean;
  getValidationError?: (file: File) => string | null;
  isAllowedFile?: (file: File) => boolean;
  canAddMoreFiles?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

export function HomeScreen({
  onSendMessage,
  isLoading,
  pendingAttachments,
  onAddFiles,
  onRemoveFile,
  onRetryFile,
  isUploading,
  isProcessing,
  getValidationError,
  isAllowedFile,
  canAddMoreFiles,
}: HomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 sm:p-8">
      <motion.div
        className="w-full max-w-3xl space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div className="space-y-4" variants={itemVariants}>
          {/* Welcome heading */}
          <motion.div
            className="flex items-center justify-center"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              type: 'spring',
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
              Olá! Como posso ajudar você hoje?
            </h1>
          </motion.div>

          {/* Subtitle */}
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto text-center">
            Estou aqui para ajudar com suas perguntas, criar conteúdo, analisar
            dados e muito mais.
          </p>
        </motion.div>

        {/* Input Box */}
        <motion.div className="w-full space-y-3" variants={itemVariants}>
          <PromptInputBox
            onSend={onSendMessage}
            isLoading={isLoading}
            placeholder="Digite sua mensagem..."
            className="min-h-[120px]"
            pendingAttachments={pendingAttachments}
            onAddFiles={onAddFiles}
            onRemoveFile={onRemoveFile}
            onRetryFile={onRetryFile}
            isUploading={isUploading}
            isProcessing={isProcessing}
            getValidationError={getValidationError}
            isAllowedFile={isAllowedFile}
            canAddMoreFiles={canAddMoreFiles}
          />

          {/* Suggested Prompts */}
          <SuggestedPrompts onPromptClick={onSendMessage} />
        </motion.div>
      </motion.div>
    </div>
  );
}
