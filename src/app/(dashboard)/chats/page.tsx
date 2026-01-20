'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatsPage } from '@/components/chats/ChatsPage';

function ChatsPageContent() {
  const searchParams = useSearchParams();
  const [autoFocus, setAutoFocus] = useState(false);

  useEffect(() => {
    // Auto-focus search if navigated via Ctrl+K
    const fromShortcut = searchParams.get('focus') === 'true';
    setAutoFocus(fromShortcut);
  }, [searchParams]);

  return <ChatsPage autoFocusSearch={autoFocus} />;
}

export default function ChatsPageRoute() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center">Carregando...</div>}>
      <ChatsPageContent />
    </Suspense>
  );
}

