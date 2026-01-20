'use client';

import { motion } from 'framer-motion';
import { SUGGESTED_PROMPTS } from '@/config/constants';

interface SuggestedPromptsProps {
  onPromptClick: (prompt: string) => void;
}

export function SuggestedPrompts({ onPromptClick }: SuggestedPromptsProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {SUGGESTED_PROMPTS.map((prompt, index) => {
          const Icon = prompt.icon;
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{
                scale: 1.05,
              }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 17,
                delay: index * 0.05,
              }}
              className="flex items-center gap-2 rounded-full bg-muted/50 hover:bg-muted px-4 py-2 text-sm text-muted-foreground border border-border/50 cursor-pointer transition-colors"
              onClick={() => onPromptClick(prompt.text)}
            >
              <Icon className="h-4 w-4" />
              <span>{prompt.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
