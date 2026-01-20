'use client';

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, FileText } from 'lucide-react';
import { TabbedClarificationQuestions } from './TabbedClarificationQuestions';
import { PlanApprovalCard } from './PlanApprovalCard';
import { useInterrupt } from '@/lib/hooks/useInterrupt';
import {
  isClarificationQuestions,
  isPlanApprovalInterrupt,
} from '@/types/interrupt';
import type {
  ClarificationQuestionsResponse,
  PlanApprovalResponse,
  ClarificationQuestionsData,
  PlanApprovalInterruptData,
} from '@/types/interrupt';

/**
 * Wrapper component for displaying LangGraph interrupts in the chat input area
 * Shows a card that replaces the input bar with smooth animation
 * Supports both clarification questions and plan approval interrupts
 */
export function InterruptCard() {
  const { activeInterrupt, isSubmitting, submitResponse } = useInterrupt();

  const handleClarificationSubmit = useCallback(
    (responses: ClarificationQuestionsResponse) => {
      submitResponse(responses);
    },
    [submitResponse]
  );

  const handlePlanApprovalSubmit = useCallback(
    (response: PlanApprovalResponse) => {
      submitResponse(response);
    },
    [submitResponse]
  );

  // Don't render if no active interrupt
  if (!activeInterrupt.active || !activeInterrupt.data) {
    return null;
  }

  const isClarification = isClarificationQuestions(activeInterrupt.data);
  const isPlanApproval = isPlanApprovalInterrupt(activeInterrupt.data);

  // Get header content based on interrupt type
  const getHeaderContent = () => {
    if (isClarification) {
      return {
        icon: <HelpCircle className="h-4 w-4" />,
        title: 'Preciso de mais informacoes',
      };
    }
    if (isPlanApproval) {
      return {
        icon: <FileText className="h-4 w-4" />,
        title: 'Aprovar plano da apresentacao',
      };
    }
    return {
      icon: <HelpCircle className="h-4 w-4" />,
      title: 'Aguardando resposta',
    };
  };

  const header = getHeaderContent();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeInterrupt.type}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
          opacity: { duration: 0.25 },
        }}
        className="w-full"
      >
        <div className="rounded-xl border border-primary/20 bg-card/95 backdrop-blur-md shadow-lg overflow-hidden max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30 flex-shrink-0">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              {header.icon}
            </span>
            <span className="text-sm font-medium text-foreground">
              {header.title}
            </span>
          </div>

          {/* Content - scrollable */}
          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            {isClarification && (
              <TabbedClarificationQuestions
                data={activeInterrupt.data as ClarificationQuestionsData}
                onSubmit={handleClarificationSubmit}
                isSubmitting={isSubmitting}
              />
            )}

            {isPlanApproval && (
              <PlanApprovalCard
                data={activeInterrupt.data as PlanApprovalInterruptData}
                onSubmit={handlePlanApprovalSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Export for use in MessageList or ChatInterface
 */
export { ClarificationQuestions } from './ClarificationQuestions';
export { TabbedClarificationQuestions } from './TabbedClarificationQuestions';
export { PlanApprovalCard } from './PlanApprovalCard';
