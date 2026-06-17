import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Extract User-Agent header from request.
 *
 * @example
 * ```typescript
 * @Get()
 * handler(@UserAgent() userAgent: string | undefined) {
 *   // userAgent contains the client's user agent string
 * }
 * ```
 */
export const UserAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers['user-agent'];
  },
);
