import { createZodDto } from 'nestjs-zod';
import {
  SendMessageSchema,
  StartConversationSchema,
  UpdateMessageSchema,
  AddReactionSchema,
  ConversationParamsSchema,
  MessageParamsSchema,
  ConversationQuerySchema,
  MessagesQuerySchema,
  MessageSearchQuerySchema,
  TypingEventSchema,
  MessageReadEventSchema,
  JoinConversationEventSchema,
  GiphySearchQuerySchema,
  GiphyTrendingQuerySchema,
} from '@varaperformance/core';
import { z } from 'zod';

// Message DTOs
export class SendMessageDto extends createZodDto(SendMessageSchema) {}
export class UpdateMessageDto extends createZodDto(UpdateMessageSchema) {}
export class AddReactionDto extends createZodDto(AddReactionSchema) {}

// Conversation DTOs
export class StartConversationDto extends createZodDto(
  StartConversationSchema,
) {}
export class ConversationQueryDto extends createZodDto(
  ConversationQuerySchema,
) {}
export class MessagesQueryDto extends createZodDto(MessagesQuerySchema) {}
export class MessageSearchQueryDto extends createZodDto(
  MessageSearchQuerySchema,
) {}

// Param DTOs
export class ConversationParamsDto extends createZodDto(
  ConversationParamsSchema,
) {}
export class MessageParamsDto extends createZodDto(MessageParamsSchema) {}

// Socket event DTOs
export class TypingEventDto extends createZodDto(TypingEventSchema) {}
export class MessageReadEventDto extends createZodDto(MessageReadEventSchema) {}
export class JoinConversationEventDto extends createZodDto(
  JoinConversationEventSchema,
) {}

// Archive/Block conversation
export class UpdateConversationStatusDto extends createZodDto(
  z.object({
    status: z.enum(['ACTIVE', 'ARCHIVED', 'BLOCKED']),
  }),
) {}

// Giphy DTOs
export class GiphySearchQueryDto extends createZodDto(GiphySearchQuerySchema) {}
export class GiphyTrendingQueryDto extends createZodDto(
  GiphyTrendingQuerySchema,
) {}
