import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SecretsService } from '@app/common/secrets';
import { NotificationService } from './notification.service';
import type {
  NotificationServerToClientEvents,
  NotificationClientToServerEvents,
  NotificationResponse,
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
  namespace: 'notifications',
  cors: {
    origin: wsCorsOrigins && wsCorsOrigins.length > 0 ? wsCorsOrigins : true,
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server<
    NotificationClientToServerEvents,
    NotificationServerToClientEvents
  >;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
    private readonly secrets: SecretsService,
  ) {}

  afterInit() {
    this.logger.log('Notification WebSocket Gateway initialized');
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
      const jwtSecret = this.secrets.getOrThrow('JWT_SECRET');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      if (!payload.sub) {
        throw new WsException('Invalid token payload');
      }

      // Store user ID on socket
      client.userId = payload.sub;

      // Join user's personal room for notifications
      void client.join(`user:${client.userId}`);

      // Send current unread count
      const result = await this.notificationService.getUnreadCount(
        client.userId!,
      );
      if (result.success) {
        client.emit('notification:count', { count: result.data.count });
      }

      this.logger.debug(
        `Client ${client.id} connected for user ${client.userId}`,
      );
    } catch (err) {
      this.logger.warn(
        `Connection rejected: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('notification:read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    await this.notificationService.markAsRead(client.userId, [
      data.notificationId,
    ]);
    client.emit('notification:read', { notificationId: data.notificationId });

    // Update count
    const result = await this.notificationService.getUnreadCount(client.userId);
    if (result.success) {
      client.emit('notification:count', { count: result.data.count });
    }
  }

  @SubscribeMessage('notification:read:all')
  async handleMarkAllRead(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    await this.notificationService.markAllAsRead(client.userId);
    client.emit('notification:read:all');
    client.emit('notification:count', { count: 0 });
  }

  @SubscribeMessage('notification:count')
  async handleGetCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const result = await this.notificationService.getUnreadCount(client.userId);
    if (result.success) {
      client.emit('notification:count', { count: result.data.count });
    }
  }

  /**
   * Send a notification to a specific user (called from other services)
   */
  sendToUser(userId: string, notification: NotificationResponse): void {
    this.logger.debug(
      `Sending notification to user:${userId}, notificationId=${notification.id}`,
    );
    this.server.to(`user:${userId}`).emit('notification:new', notification);

    // Also update the count
    this.notificationService
      .getUnreadCount(userId)
      .then((result) => {
        if (result.success) {
          this.logger.debug(
            `Sending count update to user:${userId}, count=${result.data.count}`,
          );
          this.server
            .to(`user:${userId}`)
            .emit('notification:count', { count: result.data.count });
        }
      })
      .catch((err) => {
        this.logger.error(`Failed to get unread count for user ${userId}`, err);
      });
  }
}
