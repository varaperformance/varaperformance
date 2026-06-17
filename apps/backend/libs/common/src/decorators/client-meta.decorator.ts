import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Request context metadata for audit logging and session tracking.
 */
export interface ClientMetadata {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Extract client metadata (IP address and user agent) in a single decorator.
 * Useful when you need both values together for audit logging.
 *
 * @example
 * ```typescript
 * @Post()
 * handler(@ClientMeta() meta: ClientMetadata) {
 *   // meta.ipAddress - client IP
 *   // meta.userAgent - client user agent
 * }
 * ```
 */
export const ClientMeta = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientMetadata => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];

    let ipAddress: string | undefined;
    if (typeof forwarded === 'string') {
      ipAddress = forwarded.split(',')[0].trim();
    } else {
      ipAddress = request.ip || request.socket?.remoteAddress;
    }

    return {
      ipAddress,
      userAgent: request.headers['user-agent'],
    };
  },
);
