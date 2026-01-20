import { Receipt, FileClock, CalendarCheck, MessageSquarePlus } from 'lucide-react';

export const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 30000,
  withCredentials: true,
};

export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

export const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL || 
  'https://gswjkjuftdikymnqbnmm.supabase.co/storage/v1/object/public/public_img';

export const STORAGE_KEYS = {
  accessToken: 'vora_access_token',
  refreshToken: 'vora_refresh_token',
  user: 'vora_user',
};

export const ROUTES = {
  home: '/',
  login: '/login',
  chat: '/chat',
  chatWithId: (id: string) => `/chat/${id}`,
  chats: '/chats',
  history: '/history',
  feedback: '/feedback',
  wiki: '/wiki',
};

export const CONVERSATION_GROUPS = {
  today: 'Hoje',
  yesterday: 'Ontem',
  lastWeek: 'Últimos 7 dias',
  lastMonth: 'Últimos 30 dias',
  older: 'Mais antigos',
};

export interface SuggestedPrompt {
  label: string;
  text: string;
  icon: typeof Receipt;
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { 
    label: 'Histórico de Faturas', 
    text: 'Buscar histórico de faturas da distribuidora com dados de consumo, demanda e custos.',
    icon: Receipt 
  },
  { 
    label: 'Contratos de Curto Prazo', 
    text: 'Ver contratos de energia de curto prazo com detalhes de fornecedores, volumes e valores.',
    icon: FileClock 
  },
  { 
    label: 'Contratos de Longo Prazo', 
    text: 'Consultar contratos de energia de longo prazo com informações de vigência e condições.',
    icon: CalendarCheck 
  },
  { 
    label: 'Enviar Feedback', 
    text: 'Enviar feedback, sugestão de funcionalidade ou reportar um problema.',
    icon: MessageSquarePlus 
  },
];

export const CHAT_CONFIG = {
  maxInputLength: 4000,
  maxInputHeight: 200,
  messagesPerPage: 50,
  streamingDelay: 20, // ms between chunks
};
