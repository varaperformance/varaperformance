import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

export const INTERNAL_ENDPOINT_KEY = 'internal-endpoint';

/**
 * Decorator to mark an endpoint as internal (worker-to-backend).
 * The guard validates the `x-internal-signature` header using
 * HMAC-SHA256 of the raw request body signed with INTERNAL_API_KEY.
 *
 * Falls back to constant-time comparison of `x-internal-api-key`
 * for backward compatibility during migration.
 */
export const InternalEndpoint = () =>
  Reflect.metadata(INTERNAL_ENDPOINT_KEY, true);

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isInternal = this.reflector.getAllAndOverride<boolean>(
      INTERNAL_ENDPOINT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isInternal) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const secret = process.env.INTERNAL_API_KEY;

    if (!secret) {
      throw new UnauthorizedException('Internal API key not configured');
    }

    // Prefer HMAC signature verification
    const signature = request.headers['x-internal-signature'] as
      | string
      | undefined;
    if (signature) {
      return this.verifyHmac(secret, request, signature);
    }

    // Fallback: constant-time comparison of raw API key
    const apiKey = request.headers['x-internal-api-key'] as string | undefined;
    if (apiKey) {
      return this.verifyApiKey(secret, apiKey);
    }

    throw new UnauthorizedException('Missing internal authentication');
  }

  private verifyHmac(
    secret: string,
    request: Request,
    signature: string,
  ): boolean {
    const body =
      typeof request.body === 'string'
        ? request.body
        : JSON.stringify(request.body ?? '');

    const expected = createHmac('sha256', secret).update(body).digest('hex');

    if (expected.length !== signature.length) {
      throw new UnauthorizedException('Invalid internal signature');
    }

    const isValid = timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid internal signature');
    }

    return true;
  }

  private verifyApiKey(secret: string, apiKey: string): boolean {
    const secretBuf = Buffer.from(secret);
    const keyBuf = Buffer.from(apiKey);

    if (secretBuf.length !== keyBuf.length) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    const isValid = timingSafeEqual(secretBuf, keyBuf);
    if (!isValid) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
