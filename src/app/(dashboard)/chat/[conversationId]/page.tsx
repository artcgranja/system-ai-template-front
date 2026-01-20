import { ChatInterface } from '@/components/chat/ChatInterface';

interface ConversationPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  return <ChatInterface conversationId={conversationId} />;
}
