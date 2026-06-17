import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Extract client IP address from request.
 * Handles x-forwarded-for header for reverse proxy scenarios.
 *
 * @example
 * ```typescript
 * @Get()
 * handler(@ClientIp() ip: string | undefined) {
 *   // ip contains the client IP address
 * }
 * ```
 */
export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const forwarded = request.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    return request.ip || request.socket?.remoteAddress;
  },
);
