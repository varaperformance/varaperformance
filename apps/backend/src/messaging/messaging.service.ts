import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { NotificationQueueService } from '@app/common/notification';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import type {
  SuccessResponse,
  ErrorResponse,
  ConversationResponse,
  ConversationsListData,
  MessageResponse,
  MessagesListData,
  MessageSearchData,
  MessageReactionResponse,
  MessageContent,
  ConversationStatus,
  SendGif,
} from '@varaperformance/core';
import {
  conversationListSelect,
  messageSelect,
  reactionSelect,
} from './selectors/messaging.selector';
import {
  Prisma,
  MessageStatus,
  BookingStatus,
  GymPartnerStatus,
} from '../generated/prisma/client';
import {
  MESSAGE_SEARCH_DEFAULT_LIMIT,
  MESSAGE_SEARCH_MAX_LIMIT,
  MESSAGE_SEARCH_RECENT_WINDOW_SIZE,
} from './messaging.constants';
import { transformMessageForResponse } from './message-transformer';
import {
  mapConversationResponse,
  sumConversationUnread,
} from './conversation-mapper';
import {
  buildMessageContent,
  buildMessageNotificationBody,
  buildMessagePreviewText,
} from './message-content';
import { resolveSendMessageContext } from './send-message-context';

// Helper for consistent error responses
const errorResponse = (code: string, message: string): ErrorResponse => ({
  success: false,
  error: { code, message },
});

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly notificationQueue: NotificationQueueService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * Get all conversations for a user.
   */
  async getConversations(
    userId: string,
    query: { status?: ConversationStatus; page?: number; limit?: number },
  ): Promise<SuccessResponse<ConversationsListData> | ErrorResponse> {
    const { status, page = 1, limit = 20 } = query;

    // Query by canonical participant model only.
    const where: Prisma.ConversationWhereInput = {
      OR: [{ participantOneId: userId }, { participantTwoId: userId }],
      ...(status && { status }),
    };

    const [conversations, total] = await Promise.all([
      this.db.conversation.findMany({
        where,
        select: conversationListSelect,
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.conversation.count({ where }),
    ]);

    const items: ConversationResponse[] = conversations.map((conv) =>
      mapConversationResponse(conv, userId),
    );
    const totalUnread = sumConversationUnread(conversations, userId);

    return {
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        totalUnread,
      },
    };
  }

  /**
   * Get or create a conversation between two users.
   */
  async startConversation(
    userId: string,
    data: {
      coachId?: string;
      clientId?: string;
      recipientUserId?: string;
      bookingId?: string;
      initialMessage?: string;
    },
  ): Promise<SuccessResponse<ConversationResponse> | ErrorResponse> {
    const { coachId, clientId, recipientUserId, bookingId, initialMessage } =
      data;

    if (!coachId && !clientId && !recipientUserId) {
      return errorResponse(
        'MESSAGING_ERROR',
        'Either coachId, clientId, or recipientUserId is required',
      );
    }

    let targetUserId = recipientUserId ?? clientId;
    if (coachId) {
      const coach = await this.db.coach.findUnique({
        where: { id: coachId },
        select: { userId: true },
      });
      if (!coach) {
        return errorResponse('MESSAGING_ERROR', 'Coach not found');
      }
      targetUserId = coach.userId;
    }

    if (!targetUserId) {
      return errorResponse('MESSAGING_ERROR', 'Recipient not found');
    }

    if (targetUserId === userId) {
      return errorResponse(
        'MESSAGING_ERROR',
        'Cannot start conversation with yourself',
      );
    }

    const allowed = await this.canUserMessage(userId, targetUserId);
    if (!allowed.allowed) {
      return errorResponse('MESSAGING_ERROR', allowed.reason);
    }

    const [participantOneId, participantTwoId] =
      this.getCanonicalParticipantPair(userId, targetUserId);

    let conversation = await this.db.conversation.findUnique({
      where: {
        participantOneId_participantTwoId: {
          participantOneId,
          participantTwoId,
        },
      },
      select: conversationListSelect,
    });

    if (!conversation) {
      conversation = await this.db.conversation.create({
        data: {
          participantOneId,
          participantTwoId,
          bookingId,
          status: 'ACTIVE',
        },
        select: conversationListSelect,
      });
    }

    // Send initial message if provided
    if (initialMessage) {
      await this.sendMessage(userId, {
        conversationId: conversation.id,
        text: initialMessage,
      });

      // Refresh conversation to get updated lastMessageAt
      conversation = await this.db.conversation.findUnique({
        where: { id: conversation.id },
        select: conversationListSelect,
      });
    }

    const response: ConversationResponse = mapConversationResponse(
      conversation! as Parameters<typeof mapConversationResponse>[0],
      userId,
    );
    response.unreadCount = 0;

    return { success: true, data: response };
  }

  /**
   * Get messages for a conversation with cursor pagination
   */
  async getMessages(
    userId: string,
    conversationId: string,
    query: { before?: string; limit?: number },
  ): Promise<SuccessResponse<MessagesListData> | ErrorResponse> {
    const { before, limit = 50 } = query;

    const accessError = await this.ensureConversationAccess(
      userId,
      conversationId,
    );
    if (accessError) {
      return accessError;
    }

    let beforeDate: Date | undefined;
    if (before) {
      const cursor = await this.db.message.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      beforeDate = cursor?.createdAt;
    }

    const where: Prisma.MessageWhereInput = {
      conversationId,
      isDeleted: false,
      ...(beforeDate && { createdAt: { lt: beforeDate } }),
    };

    const messages = await this.db.message.findMany({
      where,
      select: messageSelect,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check hasMore
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Decrypt and transform messages
    const items: MessageResponse[] = messages
      .reverse()
      .map((msg) => this.transformMessage(msg));

    return {
      success: true,
      data: {
        items,
        hasMore,
        nextCursor: hasMore ? items[0]?.id : undefined,
      },
    };
  }

  /**
   * Search recent messages in a conversation.
   *
   * Messages are encrypted at rest, so filtering is done after decryption
   * on a bounded recent window.
   */
  async searchMessages(
    userId: string,
    conversationId: string,
    query: { q: string; limit?: number },
  ): Promise<SuccessResponse<MessageSearchData> | ErrorResponse> {
    const accessError = await this.ensureConversationAccess(
      userId,
      conversationId,
    );
    if (accessError) {
      return accessError;
    }

    const normalizedQuery = query.q.trim().toLowerCase();
    const limit = Math.min(
      query.limit ?? MESSAGE_SEARCH_DEFAULT_LIMIT,
      MESSAGE_SEARCH_MAX_LIMIT,
    );

    const recentMessages = await this.db.message.findMany({
      where: {
        conversationId,
        isDeleted: false,
      },
      select: messageSelect,
      orderBy: { createdAt: 'desc' },
      take: MESSAGE_SEARCH_RECENT_WINDOW_SIZE,
    });

    const matched: MessageResponse[] = [];
    for (const message of recentMessages) {
      const transformed = this.transformMessage(message);
      if (transformed.text.toLowerCase().includes(normalizedQuery)) {
        matched.push(transformed);
      }
      if (matched.length >= limit) {
        break;
      }
    }

    return {
      success: true,
      data: {
        conversationId,
        query: query.q,
        total: matched.length,
        items: matched,
      },
    };
  }

  /**
   * Send a new message
   */
  async sendMessage(
    userId: string,
    data: {
      conversationId: string;
      text: string;
      gif?: SendGif;
      replyToId?: string;
    },
  ): Promise<SuccessResponse<MessageResponse> | ErrorResponse> {
    const { conversationId, text, gif, replyToId } = data;

    // Validate message has content
    const hasText = text && text.trim().length > 0;
    if (!hasText && !gif) {
      return errorResponse(
        'MESSAGING_ERROR',
        'Message must have text or a GIF',
      );
    }

    // Verify access
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        participantOneId: true,
        participantTwoId: true,
        status: true,
        participantOne: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
          },
        },
        participantTwo: {
          select: {
            id: true,
            profile: { select: { displayName: true } },
          },
        },
      },
    });

    if (!conversation) {
      return errorResponse('MESSAGING_ERROR', 'Conversation not found');
    }

    const hasAccess = this.hasConversationAccess(userId, conversation);
    if (!hasAccess) {
      return errorResponse('MESSAGING_ERROR', 'Access denied');
    }

    if (conversation.status === 'BLOCKED') {
      return errorResponse('MESSAGING_ERROR', 'This conversation is blocked');
    }

    const content = buildMessageContent(text || '', gif);
    const encrypted = this.encryption.encrypt(JSON.stringify(content));

    const { recipientUserId, senderName, unreadCountUpdate } =
      resolveSendMessageContext(conversation, userId);

    const previewText = buildMessagePreviewText(text, gif);

    // Create message and update conversation in transaction
    const [message] = await this.db.$transaction([
      this.db.message.create({
        data: {
          conversationId,
          senderId: userId,
          encryptedContent: encrypted.encryptedContent,
          contentIv: encrypted.contentIv,
          contentAuthTag: encrypted.contentAuthTag,
          wrappedKey: encrypted.wrappedKey,
          status: 'SENT',
          sentAt: new Date(),
          replyToId,
        },
        select: messageSelect,
      }),
      // Update conversation
      this.db.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessageText: previewText,
          // Encrypt last message preview (GDPR Art. 32)
          ...this.encryptLastMessage(previewText),
          // Increment unread for the other participant
          ...unreadCountUpdate,
        },
      }),
    ]);

    // Create notification directly in DB for immediate push
    try {
      const notification = await this.notificationService.create({
        userId: recipientUserId,
        type: 'MESSAGE_RECEIVED',
        title: `Message from ${senderName}`,
        body: buildMessageNotificationBody(previewText),
        actionUrl: `/messages?conversation=${conversationId}`,
        data: { conversationId },
      });

      // Push to user's socket for real-time update
      if (notification) {
        this.notificationGateway.sendToUser(recipientUserId, notification);
      }
    } catch (err) {
      // Log but don't fail the message send
      this.logger.error('Failed to create/push notification', err);
    }

    return {
      success: true,
      data: this.transformMessage(message),
    };
  }

  /**
   * Mark a message as read
   */
  async markAsRead(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<
    | SuccessResponse<{ messageId: string; status: MessageStatus }>
    | ErrorResponse
  > {
    const accessError = await this.ensureConversationAccess(
      userId,
      conversationId,
    );
    if (accessError) {
      return accessError;
    }

    const message = await this.db.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, status: true },
    });

    if (!message) {
      return errorResponse('MESSAGING_ERROR', 'Message not found');
    }

    // Only recipient can mark as read
    if (message.senderId === userId) {
      return errorResponse(
        'MESSAGING_ERROR',
        'Cannot mark own message as read',
      );
    }

    // Update message status
    await this.db.message.update({
      where: { id: messageId },
      data: {
        status: 'READ',
        readAt: new Date(),
        // Also set delivered if not already
        deliveredAt: message.status === 'SENT' ? new Date() : undefined,
      },
    });

    // Reset unread count for this user
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      select: { participantOneId: true, participantTwoId: true },
    });

    if (!conversation) {
      return errorResponse('MESSAGING_ERROR', 'Conversation not found');
    }

    const userIsParticipantOne = conversation.participantOneId === userId;

    await this.db.conversation.update({
      where: { id: conversationId },
      data: userIsParticipantOne
        ? { participantOneUnreadCount: 0 }
        : { participantTwoUnreadCount: 0 },
    });

    return {
      success: true,
      data: { messageId, status: 'READ' },
    };
  }

  /**
   * Edit a message
   */
  async editMessage(
    userId: string,
    conversationId: string,
    messageId: string,
    data: { text: string },
  ): Promise<SuccessResponse<MessageResponse> | ErrorResponse> {
    const message = await this.db.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, isDeleted: true },
    });

    if (!message || message.isDeleted) {
      return errorResponse('MESSAGING_ERROR', 'Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Can only edit your own messages');
    }

    // Encrypt new content
    const content: MessageContent = { text: data.text };
    const encrypted = this.encryption.encrypt(JSON.stringify(content));

    const updated = await this.db.message.update({
      where: { id: messageId },
      data: {
        encryptedContent: encrypted.encryptedContent,
        contentIv: encrypted.contentIv,
        contentAuthTag: encrypted.contentAuthTag,
        wrappedKey: encrypted.wrappedKey,
        isEdited: true,
        editedAt: new Date(),
      },
      select: messageSelect,
    });

    return {
      success: true,
      data: this.transformMessage(updated),
    };
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(
    userId: string,
    conversationId: string,
    messageId: string,
  ): Promise<SuccessResponse<{ messageId: string }> | ErrorResponse> {
    const message = await this.db.message.findUnique({
      where: { id: messageId },
      select: { senderId: true },
    });

    if (!message) {
      return errorResponse('MESSAGING_ERROR', 'Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    await this.db.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      data: { messageId },
    };
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    userId: string,
    messageId: string,
    emoji: string,
  ): Promise<SuccessResponse<MessageReactionResponse> | ErrorResponse> {
    // Verify message exists and user has access
    const message = await this.db.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });

    if (!message) {
      return errorResponse('MESSAGING_ERROR', 'Message not found');
    }

    const accessError = await this.ensureConversationAccess(
      userId,
      message.conversationId,
    );
    if (accessError) {
      return accessError;
    }

    // Upsert reaction
    const reaction = await this.db.messageReaction.upsert({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
      create: {
        messageId,
        userId,
        emoji,
      },
      update: {}, // No update needed
      select: reactionSelect,
    });

    return {
      success: true,
      data: {
        id: reaction.id,
        emoji: reaction.emoji,
        userId: reaction.userId,
        displayName: reaction.user.profile?.displayName ?? undefined,
        createdAt: reaction.createdAt.toISOString(),
      },
    };
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(
    userId: string,
    messageId: string,
    emoji: string,
  ): Promise<SuccessResponse<{ reactionId: string }> | ErrorResponse> {
    const reaction = await this.db.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: { messageId, userId, emoji },
      },
    });

    if (!reaction) {
      return errorResponse('MESSAGING_ERROR', 'Reaction not found');
    }

    if (reaction.userId !== userId) {
      throw new ForbiddenException('Can only remove your own reactions');
    }

    await this.db.messageReaction.delete({
      where: { id: reaction.id },
    });

    return {
      success: true,
      data: { reactionId: reaction.id },
    };
  }

  /**
   * Update conversation status (archive/block)
   */
  async updateConversationStatus(
    userId: string,
    conversationId: string,
    status: ConversationStatus,
  ): Promise<
    | SuccessResponse<{ conversationId: string; status: ConversationStatus }>
    | ErrorResponse
  > {
    const accessError = await this.ensureConversationAccess(
      userId,
      conversationId,
    );
    if (accessError) {
      return accessError;
    }

    await this.db.conversation.update({
      where: { id: conversationId },
      data: { status },
    });

    return {
      success: true,
      data: { conversationId, status },
    };
  }

  /**
   * Get a single conversation by ID
   */
  async getConversation(
    userId: string,
    conversationId: string,
  ): Promise<SuccessResponse<ConversationResponse> | ErrorResponse> {
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      select: conversationListSelect,
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (!this.hasConversationAccess(userId, conversation)) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      success: true,
      data: mapConversationResponse(conversation, userId),
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Verify user has access to a conversation
   */
  async verifyConversationAccess(
    userId: string,
    conversationId: string,
  ): Promise<boolean> {
    const conversation = await this.db.conversation.findUnique({
      where: { id: conversationId },
      select: {
        participantOneId: true,
        participantTwoId: true,
      },
    });

    if (!conversation) return false;

    return this.hasConversationAccess(userId, conversation);
  }

  private hasConversationAccess(
    userId: string,
    conversation: {
      participantOneId: string;
      participantTwoId: string;
    },
  ): boolean {
    return (
      conversation.participantOneId === userId ||
      conversation.participantTwoId === userId
    );
  }

  private async ensureConversationAccess(
    userId: string,
    conversationId: string,
  ): Promise<ErrorResponse | null> {
    const hasAccess = await this.verifyConversationAccess(
      userId,
      conversationId,
    );
    if (!hasAccess) {
      return errorResponse('MESSAGING_ERROR', 'Access denied');
    }

    return null;
  }

  private getCanonicalParticipantPair(
    userIdA: string,
    userIdB: string,
  ): [string, string] {
    return userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];
  }

  private async canUserMessage(
    senderUserId: string,
    targetUserId: string,
  ): Promise<{ allowed: boolean; reason: string }> {
    const [senderCoach, targetCoach, isGymPartner] = await Promise.all([
      this.db.coach.findUnique({
        where: { userId: senderUserId },
        select: { id: true },
      }),
      this.db.coach.findUnique({
        where: { userId: targetUserId },
        select: { id: true },
      }),
      this.areGymPartners(senderUserId, targetUserId),
    ]);

    // Users: can message any coach and accepted gym partners.
    if (!senderCoach) {
      if (targetCoach || isGymPartner) {
        return { allowed: true, reason: '' };
      }

      return {
        allowed: false,
        reason: 'You can only message coaches or your accepted gym partners.',
      };
    }

    // Coaches: can message other coaches, their clients, and gym partners.
    if (targetCoach || isGymPartner) {
      return { allowed: true, reason: '' };
    }

    const isClient = await this.hasCoachClientRelationship(
      senderCoach.id,
      targetUserId,
    );

    if (isClient) {
      return { allowed: true, reason: '' };
    }

    return {
      allowed: false,
      reason:
        'Coaches can message other coaches, their clients, or their accepted gym partners.',
    };
  }

  private async areGymPartners(
    userIdA: string,
    userIdB: string,
  ): Promise<boolean> {
    const partnership = await this.db.gymPartner.findFirst({
      where: {
        status: GymPartnerStatus.ACCEPTED,
        OR: [
          { requesterId: userIdA, receiverId: userIdB },
          { requesterId: userIdB, receiverId: userIdA },
        ],
      },
      select: { id: true },
    });

    return Boolean(partnership);
  }

  private async hasCoachClientRelationship(
    coachId: string,
    clientUserId: string,
  ): Promise<boolean> {
    const booking = await this.db.booking.findFirst({
      where: {
        coachId,
        userId: clientUserId,
        status: {
          in: [BookingStatus.APPROVED, BookingStatus.CONFIRMED],
        },
      },
      select: { id: true },
    });

    return Boolean(booking);
  }

  /**
   * Decrypt and transform a message for response
   */
  private transformMessage(message: any): MessageResponse {
    return transformMessageForResponse(message, this.encryption, this.logger);
  }

  /**
   * Encrypt last message preview text (GDPR Art. 32)
   */
  private encryptLastMessage(text: string | null | undefined) {
    if (!text) return {};
    const enc = this.encryption.encrypt(text);
    return {
      eLastMessage: enc.encryptedContent,
      lastMessageIv: enc.contentIv,
      lastMessageAuthTag: enc.contentAuthTag,
      lastMessageWrappedKey: enc.wrappedKey,
    };
  }
}
