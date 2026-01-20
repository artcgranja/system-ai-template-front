'use client';

import { ConversationHistory } from '@/components/layout/ConversationHistory';

export default function HistoryPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <h1 className="text-lg font-semibold">Histórico de Conversas</h1>
      </div>
      <div className="flex-1 overflow-hidden">
        <ConversationHistory />
      </div>
    </div>
  );
}
