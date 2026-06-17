import type {
  MessageStatus,
  ConversationStatus,
  GiphyGif,
} from '../schemas/messaging.schema';

/**
 * Reaction on a message
 */
export interface MessageReactionResponse {
  id: string;
  emoji: string;
  userId: string;
  displayName?: string;
  createdAt: string;
}

/**
 * GIF attachment for messages
 */
export interface MessageGif {
  url: string;
  previewUrl?: string;
  width?: number;
  height?: number;
  title?: string;
  giphyId?: string;
}

/**
 * Message response returned from API
 */
export interface MessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  senderDisplayName?: string;
  senderAvatarUrl?: string;
  text: string;
  gif?: MessageGif;
  status: MessageStatus;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  replyToId?: string;
  replyTo?: {
    id: string;
    text: string;
    senderDisplayName?: string;
  };
  reactions: MessageReactionResponse[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation participant info
 */
export interface ParticipantInfo {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  isCoach: boolean;
}

/**
 * Conversation response returned from API
 */
export interface ConversationResponse {
  id: string;
  participantOneId: string;
  participantTwoId: string;
  coachId?: string;
  clientId?: string;
  bookingId?: string;
  status: ConversationStatus;
  lastMessageAt?: string;
  lastMessageText?: string;
  unreadCount: number; // Unread count for current user
  participant: ParticipantInfo; // The other person in the conversation
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversation with messages (detail view)
 */
export interface ConversationDetailResponse extends ConversationResponse {
  messages: MessageResponse[];
}

/**
 * Paginated conversations list response
 */
export interface ConversationsListData {
  items: ConversationResponse[];
  total: number;
  page: number;
  limit: number;
  totalUnread: number; // Total unread across all conversations
}

/**
 * Messages list response with cursor pagination
 */
export interface MessagesListData {
  items: MessageResponse[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Message search response data
 */
export interface MessageSearchData {
  conversationId: string;
  query: string;
  total: number;
  items: MessageResponse[];
}

/**
 * Socket.IO events - Server to Client
 */
export interface ServerToClientEvents {
  // New message received
  'message:new': (message: MessageResponse) => void;
  // Message updated (edited)
  'message:updated': (message: MessageResponse) => void;
  // Message deleted
  'message:deleted': (data: {
    messageId: string;
    conversationId: string;
  }) => void;
  // Message status changed (delivered/read)
  'message:status': (data: {
    messageId: string;
    status: MessageStatus;
    timestamp: string;
  }) => void;
  // User typing indicator
  'typing:update': (data: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
  // Reaction added
  'reaction:added': (data: {
    messageId: string;
    reaction: MessageReactionResponse;
  }) => void;
  // Reaction removed
  'reaction:removed': (data: { messageId: string; reactionId: string }) => void;
  // User presence update
  'presence:update': (data: { userId: string; isOnline: boolean }) => void;
  // Error event
  error: (data: { message: string; code?: string }) => void;
}

/**
 * Socket.IO events - Client to Server
 */
export interface ClientToServerEvents {
  // Join a conversation room
  'conversation:join': (data: { conversationId: string }) => void;
  // Leave a conversation room
  'conversation:leave': (data: { conversationId: string }) => void;
  // Send a message
  'message:send': (data: {
    conversationId: string;
    text: string;
    gif?: MessageGif;
    replyToId?: string;
  }) => void;
  // Mark message as read
  'message:read': (data: { conversationId: string; messageId: string }) => void;
  // Typing indicator
  'typing:start': (data: { conversationId: string }) => void;
  'typing:stop': (data: { conversationId: string }) => void;
  // Add reaction
  'reaction:add': (data: { messageId: string; emoji: string }) => void;
  // Remove reaction
  'reaction:remove': (data: { messageId: string; emoji: string }) => void;
  // Subscribe to presence for specific user IDs
  'presence:subscribe': (data: { userIds: string[] }) => void;
}

/**
 * Typing indicator state for UI
 */
export interface TypingState {
  conversationId: string;
  userId: string;
  displayName?: string;
  isTyping: boolean;
  startedAt?: string;
}
