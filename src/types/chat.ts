export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type MessageType = 'text' | 'tool_call' | 'tool_result';

export type ToolCallStatus = 'starting' | 'running' | 'completed' | 'error';

/**
 * Vote summary statistics for a message
 */
export interface VoteSummary {
  positive_count: number;
  negative_count: number;
  total_count: number;
}

// Attachment info returned with messages
export interface MessageAttachment {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: 'pending' | 'processing' | 'processed' | 'error';
}

// Backend attachment format (snake_case)
export interface BackendMessageAttachment {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  status: 'pending' | 'processing' | 'processed' | 'error';
}

export interface ToolCall {
  id: string; // call_id from backend
  tool_name: string;
  arguments: Record<string, unknown>;
  status: ToolCallStatus;
  result?: string;
  success?: boolean;
  error?: string | null;
  execution_time?: number | null;
  streamingContent?: string; // Accumulated content during tool execution streaming
}

// Content block types for displaying tool calls inline
export type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; toolCall: ToolCall };

// Content block reference - stores only order/references, not full data
// This is the "source of truth" stored in the message
// Use deriveContentBlocks() to get the full ContentBlock[] with current toolCall data
export type ContentBlockRef =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; toolCallId: string };  // Only stores reference ID

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  conversationId: string;
  isStreaming?: boolean;
  toolCalls?: ToolCall[];
  // Content block references - stores order with tool call IDs (source of truth)
  // Use deriveContentBlocks() to get full ContentBlock[] with current toolCall data
  contentBlockRefs?: ContentBlockRef[];
  // Fields for history compatibility with backend message types
  messageType?: MessageType;
  toolCallId?: string;      // For tool_result messages - links to the tool call
  toolName?: string;        // For tool_call messages
  toolArguments?: Record<string, unknown>; // For tool_call messages
  sequenceNumber?: number;  // Order in conversation
  // Attachments associated with this message
  attachments?: MessageAttachment[];
  // Vote data (only for assistant messages)
  userVote?: 'positive' | 'negative' | null;  // Current user's vote for this message
  voteSummary?: VoteSummary | null;  // Vote statistics for this message
}

// Backend response type for messages (snake_case)
export interface BackendMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
  conversation_id: string;
  // New fields from backend API
  message_type: 'text' | 'tool_call' | 'tool_result';
  tool_call_id?: string;
  tool_name?: string;
  tool_arguments?: Record<string, unknown>;
  sequence_number: number;
  // Attachments
  attachments?: BackendMessageAttachment[];
  // Vote data (only for assistant messages, null for user/tool messages)
  user_vote?: 'positive' | 'negative' | null;
  vote_summary?: VoteSummary | null;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: Date;
  createdAt: Date;
  userId: string;
  messageCount: number;
  isPinned?: boolean;
  pinnedAt?: Date | null;
  folderId?: string | null;
  displayOrder?: number;
}

export interface Folder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  order: number;
  userId: string;
  conversationCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Backend response types (snake_case) - what the API returns
export interface BackendFolder {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  order: number;
  user_id: string;
  conversation_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BackendConversation {
  id: string;
  title: string;
  last_message: string;
  updated_at: string;
  created_at: string;
  user_id: string;
  message_count: number;
  is_pinned?: boolean;
  pinned_at?: string | null;
  folder_id?: string | null;
  display_order?: number;
}

export interface ConversationGroup {
  label: string;
  conversations: Conversation[];
}

export interface CreateMessagePayload {
  conversation_id?: string | null;
  message: string;
  attachment_ids?: string[];
}

export interface ChatState {
  conversations: Conversation[];
  folders: Folder[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  isLoadingMessages: boolean;
  isLoadingConversations: boolean;
  isLoadingFolders: boolean;
  streamingMessageId: string | null;
  sidebarCollapsed: boolean;
}

export interface StreamingChunk {
  id: string;
  content: string;
  done: boolean;
}

// SSE Event Types from Backend
export interface ConversationCreatedEvent {
  conversation_id: string;
  conversation_title: string;
  user_message_id: string;
  user_message_content: string;
  created_at: string;
}

export interface UserMessageSavedEvent {
  user_message_id: string;
}

export interface AssistantMessageStartEvent {
  message_id: string;
}

export interface ContentChunk {
  text: string;
  type: string;
  index: number;
}

export interface AssistantMessageChunkEvent {
  content: string | ContentChunk[];
}

export interface AssistantMessageCompleteEvent {
  content: string | ContentChunk[];
  message_id?: string;
  full_content?: string;
}

export interface TextBlockCompleteEvent {
  content: string;
}

export interface ErrorEvent {
  error: string;
}

export interface ToolCallStartEvent {
  tool_name: string;
  arguments: Record<string, unknown>;
  call_id: string | null;
}

export interface ToolCallExecutionEvent {
  tool_name: string;
  status: string;
  call_id: string | null;
}

export interface ToolCallCompleteEvent {
  tool_name: string;
  result: string;
  success: boolean;
  execution_time: number | null;
  call_id: string | null;
  error: string | null;
}

export interface ToolContentChunkEvent {
  content: string;
  tool_name: string;
  call_id: string | null;
}

// Plan-specific SSE events (for LangGraph interrupt pattern)
export interface PlanAwaitingApprovalEvent {
  plan_id: string;
  markdown: string;
  version: number;
  thread_id: string;
  message: string;
}

export interface PlanProcessingEvent {
  plan_id: string;
  action: string;
}

export interface PlanGeneratingEvent {
  status: string;
}

export interface PresentationGeneratingEvent {
  status: string;
}

export interface PresentationCompleteEvent {
  status: 'executed';
  gamma_result?: {
    status: 'success' | 'skipped' | 'error';
    generation_id?: string;
    presentation_url?: string;
    credits_deducted?: number;
    credits_remaining?: number;
    files: {
      pdf?: { storage_path: string; signed_url: string; size_bytes: number };
      pptx?: { storage_path: string; signed_url: string; size_bytes: number };
    };
    message?: string;
    error?: string;
  };
}

export interface PlanDoneEvent {
  plan_id: string;
  status: string;
}

export type SSEEvent =
  | { event: 'conversation_created'; data: ConversationCreatedEvent }
  | { event: 'user_message_saved'; data: UserMessageSavedEvent }
  | { event: 'assistant_message_start'; data: AssistantMessageStartEvent }
  | { event: 'assistant_message_chunk'; data: AssistantMessageChunkEvent }
  | { event: 'text_block_complete'; data: TextBlockCompleteEvent }
  | { event: 'assistant_message_complete'; data: AssistantMessageCompleteEvent }
  | { event: 'tool_call_start'; data: ToolCallStartEvent }
  | { event: 'tool_call_execution'; data: ToolCallExecutionEvent }
  | { event: 'tool_content_chunk'; data: ToolContentChunkEvent }
  | { event: 'tool_call_complete'; data: ToolCallCompleteEvent }
  | { event: 'plan_awaiting_approval'; data: PlanAwaitingApprovalEvent }
  | { event: 'plan_processing'; data: PlanProcessingEvent }
  | { event: 'plan_generating'; data: PlanGeneratingEvent }
  | { event: 'presentation_generating'; data: PresentationGeneratingEvent }
  | { event: 'presentation_complete'; data: PresentationCompleteEvent }
  | { event: 'done'; data: Record<string, never> }
  | { event: 'error'; data: ErrorEvent };
