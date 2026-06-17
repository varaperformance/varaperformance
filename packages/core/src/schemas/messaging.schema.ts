import { z } from 'zod';

// Message status enum
export const MessageStatusSchema = z.enum(['SENT', 'DELIVERED', 'READ']);
export type MessageStatus = z.infer<typeof MessageStatusSchema>;

// Conversation status enum
export const ConversationStatusSchema = z.enum([
  'ACTIVE',
  'ARCHIVED',
  'BLOCKED',
]);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

// Attachment types
export const AttachmentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    url: z.url(),
    name: z.string().optional(),
    size: z.number().optional(),
  }),
  z.object({
    type: z.literal('file'),
    url: z.url(),
    name: z.string().optional(),
    size: z.number().optional(),
  }),
  z.object({
    type: z.literal('gif'),
    url: z.url(),
    previewUrl: z.url().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    title: z.string().optional(),
    giphyId: z.string().optional(), // Original Giphy ID for attribution
  }),
]);
export type Attachment = z.infer<typeof AttachmentSchema>;

// Message content - what gets encrypted
export const MessageContentSchema = z.object({
  text: z.string().min(1).max(5000),
  attachments: z.array(AttachmentSchema).optional(),
});
export type MessageContent = z.infer<typeof MessageContentSchema>;

// GIF attachment for sending
export const SendGifSchema = z.object({
  url: z.url(),
  previewUrl: z.url().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  title: z.string().optional(),
  giphyId: z.string().optional(),
});
export type SendGif = z.infer<typeof SendGifSchema>;

// Send message - client sends plaintext, server encrypts
export const SendMessageSchema = z
  .object({
    conversationId: z.uuid(),
    text: z.string().max(5000).default(''),
    gif: SendGifSchema.optional(),
    replyToId: z.uuid().optional(),
  })
  .refine((data) => data.text.trim().length > 0 || data.gif, {
    message: 'Message must have text or a GIF',
  });
export type SendMessage = z.infer<typeof SendMessageSchema>;

// Start conversation
// Supports coach lookup via coachId and direct user targeting via clientId/recipientUserId
export const StartConversationSchema = z
  .object({
    coachId: z.uuid().optional(),
    clientId: z.uuid().optional(),
    recipientUserId: z.uuid().optional(),
    bookingId: z.uuid().optional(),
    initialMessage: z.string().min(1).max(5000).optional(),
  })
  .refine((data) => data.coachId || data.clientId || data.recipientUserId, {
    message: 'Either coachId, clientId, or recipientUserId is required',
  });
export type StartConversation = z.infer<typeof StartConversationSchema>;

// Update message (edit)
export const UpdateMessageSchema = z.object({
  text: z.string().min(1).max(5000),
});
export type UpdateMessage = z.infer<typeof UpdateMessageSchema>;

// Add reaction
export const AddReactionSchema = z.object({
  emoji: z.string().max(32),
});
export type AddReaction = z.infer<typeof AddReactionSchema>;

// Conversation params
export const ConversationParamsSchema = z.object({
  conversationId: z.uuid(),
});
export type ConversationParams = z.infer<typeof ConversationParamsSchema>;

// Message params
export const MessageParamsSchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});
export type MessageParams = z.infer<typeof MessageParamsSchema>;

// Conversation query for listing
export const ConversationQuerySchema = z.object({
  status: ConversationStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type ConversationQuery = z.infer<typeof ConversationQuerySchema>;

// Messages query for fetching conversation messages
export const MessagesQuerySchema = z.object({
  before: z.uuid().optional(), // Cursor pagination
  limit: z.coerce.number().int().positive().max(100).default(50),
});
export type MessagesQuery = z.infer<typeof MessagesQuerySchema>;

export const MessageSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type MessageSearchQuery = z.infer<typeof MessageSearchQuerySchema>;

// Socket.IO event payloads
export const TypingEventSchema = z.object({
  conversationId: z.uuid(),
  isTyping: z.boolean(),
});
export type TypingEvent = z.infer<typeof TypingEventSchema>;

export const MessageReadEventSchema = z.object({
  conversationId: z.uuid(),
  messageId: z.uuid(),
});
export type MessageReadEvent = z.infer<typeof MessageReadEventSchema>;

export const JoinConversationEventSchema = z.object({
  conversationId: z.uuid(),
});
export type JoinConversationEvent = z.infer<typeof JoinConversationEventSchema>;

// Giphy Integration Schemas
export const GiphySearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().int().positive().max(50).default(25),
  offset: z.coerce.number().int().nonnegative().default(0),
  rating: z.enum(['g', 'pg', 'pg-13', 'r']).default('pg'),
});
export type GiphySearchQuery = z.infer<typeof GiphySearchQuerySchema>;

export const GiphyTrendingQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(50).default(25),
  offset: z.coerce.number().int().nonnegative().default(0),
  rating: z.enum(['g', 'pg', 'pg-13', 'r']).default('pg'),
});
export type GiphyTrendingQuery = z.infer<typeof GiphyTrendingQuerySchema>;

export const GiphyGifSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  previewUrl: z.url(),
  width: z.number(),
  height: z.number(),
  previewWidth: z.number(),
  previewHeight: z.number(),
});
export type GiphyGif = z.infer<typeof GiphyGifSchema>;

export const GiphySearchResponseSchema = z.object({
  gifs: z.array(GiphyGifSchema),
  pagination: z.object({
    totalCount: z.number(),
    count: z.number(),
    offset: z.number(),
  }),
});
export type GiphySearchResponse = z.infer<typeof GiphySearchResponseSchema>;
