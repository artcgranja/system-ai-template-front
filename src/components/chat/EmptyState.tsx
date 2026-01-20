'use client';

import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SUGGESTED_PROMPTS } from '@/config/constants';

interface EmptyStateProps {
  onPromptClick: (prompt: string) => void;
}

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="container mx-auto max-w-2xl space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-6">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Olá! Como posso ajudar você hoje?</h2>
          <p className="text-muted-foreground">
            Sou seu assistente especializado em gestão de energia. Escolha uma das sugestões abaixo ou
            digite sua própria pergunta.
          </p>
        </div>

        {/* Suggested Prompts */}
        <div className="grid gap-3 sm:grid-cols-2">
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto whitespace-normal p-4 text-left hover:border-primary"
              onClick={() => onPromptClick(prompt.text)}
            >
              <span className="line-clamp-2 text-sm">{prompt.text}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
