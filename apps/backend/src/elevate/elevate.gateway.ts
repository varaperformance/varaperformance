import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SecretsService } from '@app/common/secrets';
import type {
  ElevateClientToServerEvents,
  ElevateServerToClientEvents,
  ElevateFeedRefreshEvent,
} from '@varaperformance/core';
import * as cookie from 'cookie';

const wsCorsOrigins = (process.env.WS_CORS_ORIGINS ?? process.env.CORS_ORIGINS)
  ?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: 'elevate',
  cors: {
    origin: wsCorsOrigins && wsCorsOrigins.length > 0 ? wsCorsOrigins : true,
    credentials: true,
  },
})
export class ElevateGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server<ElevateClientToServerEvents, ElevateServerToClientEvents>;

  private readonly logger = new Logger(ElevateGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly secrets: SecretsService,
  ) {}

  afterInit() {
    this.logger.log('Elevate WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      let token: string | undefined;

      const cookies = client.handshake.headers?.cookie;
      if (cookies) {
        const parsed = cookie.parse(cookies);
        token = parsed.access_token;
      }

      if (!token) {
        token = client.handshake.auth?.token;
      }

      if (!token) {
        token = client.handshake.headers?.authorization?.replace('Bearer ', '');
      }

      if (!token) {
        throw new WsException('No authentication token');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.secrets.getOrThrow('JWT_SECRET'),
      });

      if (!payload.sub) {
        throw new WsException('Invalid token payload');
      }

      client.userId = payload.sub;
      this.logger.debug(
        `Client ${client.id} connected to elevate (user: ${client.userId})`,
      );
    } catch (err) {
      this.logger.warn(
        `Elevate socket connection rejected: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.debug(`Client ${client.id} disconnected from elevate`);
  }

  @SubscribeMessage('elevate:ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }
  }

  emitFeedRefresh(event: Omit<ElevateFeedRefreshEvent, 'timestamp'>): void {
    const payload: ElevateFeedRefreshEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.server.emit('elevate:feed:refresh', payload);
  }
}
