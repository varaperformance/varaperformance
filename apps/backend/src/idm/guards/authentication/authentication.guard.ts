import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '@app/database/database.service';
import { RedisService } from '@app/database/redis.service';
import jwtConfig from '../../config/jwt.config';
import { Request } from 'express';
import { REQUEST_USER_KEY } from 'src/idm/constants/idm.constants';
import { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { IS_PUBLIC_KEY } from 'src/idm/decorators/public.decorator';
import { ALLOW_RESTRICTED_KEY } from 'src/idm/decorators/allow-restricted.decorator';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prismaService: DatabaseService,
    private readonly redisService: RedisService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        token,
        this.jwtConfiguration,
      );

      // SOC2: Check if user account is still active
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        select: { isActive: true, isRestricted: true, deletedAt: true },
      });

      if (!user || !user.isActive || user.deletedAt) {
        throw new ForbiddenException('Account has been deactivated');
      }

      // GDPR Art. 18: Check if processing is restricted
      if (user.isRestricted) {
        const allowRestricted = this.reflector.getAllAndOverride<boolean>(
          ALLOW_RESTRICTED_KEY,
          [context.getHandler(), context.getClass()],
        );
        if (!allowRestricted) {
          throw new ForbiddenException(
            'Account processing is restricted. You may still export your data or manage your account from Settings.',
          );
        }
      }

      // SOC2: Check if session has been revoked (e.g., logout, logout-all)
      const activeSession = await this.redisService
        .getClient()
        .get(`session:${payload.sub}`);
      if (!activeSession) {
        throw new UnauthorizedException('Session has been invalidated');
      }

      request[REQUEST_USER_KEY] = payload;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractToken(request: Request): string | undefined {
    // Try Authorization header first, then cookie
    return (
      this.extractTokenFromHeader(request) ||
      this.extractTokenFromCookie(request)
    );
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [, token] = request.headers.authorization?.split(' ') ?? [];
    return token;
  }

  private extractTokenFromCookie(request: Request): string | undefined {
    return request.cookies?.access_token;
  }
}
