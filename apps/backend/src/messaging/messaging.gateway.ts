import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SecretsService } from '@app/common/secrets';
import { MessagingService } from './messaging.service';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  MessageResponse,
} from '@varaperformance/core';
import * as cookie from 'cookie';

const wsCorsOrigins = (process.env.WS_CORS_ORIGINS ?? process.env.CORS_ORIGINS)
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Extended socket with user data
interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: 'messaging',
  cors: {
    origin: wsCorsOrigins && wsCorsOrigins.length > 0 ? wsCorsOrigins : true,
    credentials: true,
  },
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server<ClientToServerEvents, ServerToClientEvents>;

  private readonly logger = new Logger(MessagingGateway.name);

  // Track typing states with timeouts
  private typingTimeouts = new Map<string, NodeJS.Timeout>();

  // Track connected users: userId → Set of socketIds
  private connectedUsers = new Map<string, Set<string>>();

  constructor(
    private readonly messagingService: MessagingService,
    private readonly jwtService: JwtService,
    private readonly secrets: SecretsService,
  ) {}

  afterInit() {
    this.logger.log('Messaging WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract JWT from cookie, handshake auth, or header
      let token: string | undefined;

      // 1. Try cookies first (browser clients)
      const cookies = client.handshake.headers?.cookie;
      if (cookies) {
        const parsed = cookie.parse(cookies);
        token = parsed.access_token;
      }

      // 2. Fall back to handshake auth (mobile/API clients)
      if (!token) {
        token = client.handshake.auth?.token;
      }

      // 3. Fall back to Authorization header
      if (!token) {
        token = client.handshake.headers?.authorization?.replace('Bearer ', '');
      }

      if (!token) {
        throw new WsException('No authentication token');
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.secrets.getOrThrow('JWT_SECRET'),
      });

      client.userId = payload.sub;
      this.logger.log(
        `Client connected: ${client.id} (user: ${client.userId})`,
      );

      // Track user connection for presence
      const userId: string = payload.sub;
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(client.id);

      // If this is the user's first connection, broadcast online
      if (this.connectedUsers.get(userId)!.size === 1) {
        this.server.emit('presence:update', { userId, isOnline: true });
      }
    } catch (error) {
      this.logger.warn(`Connection rejected: ${client.id} - ${error}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Update presence tracking
    if (client.userId) {
      const sockets = this.connectedUsers.get(client.userId);
      if (sockets) {
        sockets.delete(client.id);
        // If no more connections, broadcast offline
        if (sockets.size === 0) {
          this.connectedUsers.delete(client.userId);
          this.server.emit('presence:update', {
            userId: client.userId,
            isOnline: false,
          });
        }
      }
    }

    // Clear any typing timeouts for this client
    for (const [key, timeout] of this.typingTimeouts.entries()) {
      if (key.startsWith(`${client.userId}:`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }
  }

  // ============================================
  // Conversation Room Management
  // ============================================

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    // Verify access
    const hasAccess = await this.messagingService.verifyConversationAccess(
      client.userId,
      data.conversationId,
    );

    if (!hasAccess) {
      throw new WsException('Access denied');
    }

    // Join the room
    await client.join(`conversation:${data.conversationId}`);
    this.logger.debug(
      `User ${client.userId} joined conversation ${data.conversationId}`,
    );
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    await client.leave(`conversation:${data.conversationId}`);
    this.logger.debug(
      `User ${client.userId} left conversation ${data.conversationId}`,
    );
  }

  // ============================================
  // Messaging
  // ============================================

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      conversationId: string;
      text: string;
      gif?: {
        url: string;
        previewUrl?: string;
        width?: number;
        height?: number;
        title?: string;
        giphyId?: string;
      };
      replyToId?: string;
    },
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const result = await this.messagingService.sendMessage(client.userId, data);

    if (!result.success) {
      throw new WsException(result.error?.message || 'Failed to send message');
    }

    // Broadcast to all clients in the conversation room
    this.server
      .to(`conversation:${data.conversationId}`)
      .emit('message:new', result.data);

    return result.data;
  }

  @SubscribeMessage('message:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const result = await this.messagingService.markAsRead(
      client.userId,
      data.conversationId,
      data.messageId,
    );

    if (result.success) {
      // Notify the room about the status change
      this.server
        .to(`conversation:${data.conversationId}`)
        .emit('message:status', {
          messageId: data.messageId,
          status: 'READ',
          timestamp: new Date().toISOString(),
        });
    }

    return result;
  }

  // ============================================
  // Typing Indicators
  // ============================================

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    const key = `${client.userId}:${data.conversationId}`;

    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Broadcast typing status
    client.to(`conversation:${data.conversationId}`).emit('typing:update', {
      conversationId: data.conversationId,
      userId: client.userId,
      isTyping: true,
    });

    // Auto-clear after 5 seconds
    const timeout = setTimeout(() => {
      client.to(`conversation:${data.conversationId}`).emit('typing:update', {
        conversationId: data.conversationId,
        userId: client.userId!,
        isTyping: false,
      });
      this.typingTimeouts.delete(key);
    }, 5000);

    this.typingTimeouts.set(key, timeout);
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    const key = `${client.userId}:${data.conversationId}`;

    // Clear timeout
    const existingTimeout = this.typingTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.typingTimeouts.delete(key);
    }

    // Broadcast stopped typing
    client.to(`conversation:${data.conversationId}`).emit('typing:update', {
      conversationId: data.conversationId,
      userId: client.userId,
      isTyping: false,
    });
  }

  // ============================================
  // Presence
  // ============================================

  @SubscribeMessage('presence:subscribe')
  handlePresenceSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { userIds: string[] },
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    // Return current online status for requested users
    for (const userId of data.userIds) {
      const isOnline = this.connectedUsers.has(userId);
      client.emit('presence:update', { userId, isOnline });
    }
  }

  // ============================================
  // Reactions
  // ============================================

  @SubscribeMessage('reaction:add')
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const result = await this.messagingService.addReaction(
      client.userId,
      data.messageId,
      data.emoji,
    );

    if (result.success && result.data) {
      // Get the conversation ID for this message
      // For now, broadcast to all connected clients
      this.server.emit('reaction:added', {
        messageId: data.messageId,
        reaction: result.data,
      });
    }

    return result;
  }

  @SubscribeMessage('reaction:remove')
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const result = await this.messagingService.removeReaction(
      client.userId,
      data.messageId,
      data.emoji,
    );

    if (result.success && result.data) {
      this.server.emit('reaction:removed', {
        messageId: data.messageId,
        reactionId: result.data.reactionId,
      });
    }

    return result;
  }

  // ============================================
  // Public methods for external notifications
  // ============================================

  /**
   * Emit a new message to a conversation room (called from service)
   */
  emitNewMessage(conversationId: string, message: MessageResponse) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:new', message);
  }

  /**
   * Emit message update to a conversation room
   */
  emitMessageUpdated(conversationId: string, message: MessageResponse) {
    this.server
      .to(`conversation:${conversationId}`)
      .emit('message:updated', message);
  }

  /**
   * Emit message deletion to a conversation room
   */
  emitMessageDeleted(conversationId: string, messageId: string) {
    this.server.to(`conversation:${conversationId}`).emit('message:deleted', {
      messageId,
      conversationId,
    });
  }
}
