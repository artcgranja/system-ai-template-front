"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VoteButtons } from "./VoteButtons";
import type { Message } from '@/types/chat';

interface MessageActionsProps {
  content: string;
  onRegenerate?: () => void;
  messageIds?: string[];
  messages: Message[];
  onRefreshMessages?: () => Promise<void>;
  className?: string;
}

export function MessageActions({
  content,
  onRegenerate,
  messageIds,
  messages,
  onRefreshMessages,
  className,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        className
      )}
    >
      {/* Copy Button with green checkmark feedback */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className={cn(
          "h-8 gap-1.5 px-2 hover:bg-accent/50",
          copied
            ? "text-green-600 dark:text-green-500"
            : "text-[#6B7280] hover:text-foreground"
        )}
        title={copied ? "Copiado!" : "Copiar mensagem"}
      >
        {copied ? (
          <>
            <Check className="h-[18px] w-[18px]" />
            <span className="text-xs font-medium">Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="h-[18px] w-[18px]" />
            <span className="text-xs">Copiar</span>
          </>
        )}
      </Button>

      {/* Regenerate Button */}
      {onRegenerate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerate}
          className="h-8 gap-1.5 px-2 text-[#6B7280] hover:text-foreground hover:bg-accent/50"
          title="Regenerar resposta"
        >
          <RefreshCw className="h-[18px] w-[18px]" />
          <span className="text-xs">Regenerar</span>
        </Button>
      )}

      {/* Vote Buttons - Only show if messageIds are provided */}
      {messageIds && messageIds.length > 0 && (
        <VoteButtons 
          messageIds={messageIds} 
          messages={messages}
          onVoteComplete={onRefreshMessages}
          className="ml-1" 
        />
      )}
    </div>
  );
}
