import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { DatabaseService } from '@app/database/database.service';
import { RedisService } from '@app/database/redis.service';
import { REQUEST_USER_KEY } from '../../constants/idm.constants';
import { JwtPayload } from '../../interfaces/jwt.interface';
import { PERMISSIONS_KEY } from '../../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

interface UserWithRolesAndPermissions {
  roles: Array<{
    role: {
      name: string;
      permissions: Array<{
        permission: {
          resource: string;
          action: string;
        };
      }>;
    };
  }>;
  permissions: Array<{
    permission: {
      resource: string;
      action: string;
    };
  }>;
}

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private static readonly CACHE_TTL_SECONDS = 300; // 5 minutes

  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip authorization for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required permissions from route metadata
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access (authenticated-only route)
    if (!requiredPermissions?.length) {
      return true;
    }

    // Extract user from request (set by AccessTokenGuard)
    const request = context.switchToHttp().getRequest<Request>();
    const user = request[REQUEST_USER_KEY] as JwtPayload | undefined;

    if (!user?.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Fetch user's permissions (cached in Redis for 5 minutes)
    const userPermissions = await this.getUserPermissions(user.sub);

    if (!userPermissions) {
      throw new ForbiddenException('User not found');
    }

    // Check permissions (user must have all required permissions)
    // Supports wildcards: *:* (all), resource:* (all actions on resource), *:action (action on all resources)
    // SUPERADMIN should be granted *:* permission in the database
    const hasAllPermissions = requiredPermissions.every((required) => {
      // Direct match
      if (userPermissions.has(required)) return true;

      // Wildcard checks
      if (userPermissions.has('*:*') || userPermissions.has('*')) return true;

      const [requiredResource, requiredAction] = required.split(':');

      // Check resource:* wildcard (e.g., user:* allows user:create)
      if (userPermissions.has(`${requiredResource}:*`)) return true;

      // Check *:action wildcard (e.g., *:read allows user:read)
      if (userPermissions.has(`*:${requiredAction}`)) return true;

      return false;
    });

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }

  /**
   * Fetch user permissions from Redis cache or database.
   * Returns null if user not found.
   */
  private async getUserPermissions(
    userId: string,
  ): Promise<Set<string> | null> {
    const cacheKey = `permissions:${userId}`;

    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return new Set<string>(JSON.parse(cached));
    }

    // Fetch from database
    const userWithRoles = (await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    })) as UserWithRolesAndPermissions | null;

    if (!userWithRoles) {
      return null;
    }

    // Aggregate permissions from all sources
    const permissionSet = new Set<string>();

    for (const userRole of userWithRoles.roles) {
      for (const rolePermission of userRole.role.permissions) {
        const { resource, action } = rolePermission.permission;
        permissionSet.add(`${resource}:${action}`);
      }
    }

    for (const userPermission of userWithRoles.permissions) {
      const { resource, action } = userPermission.permission;
      permissionSet.add(`${resource}:${action}`);
    }

    // Cache for 5 minutes
    await this.redisService.set(
      cacheKey,
      JSON.stringify([...permissionSet]),
      AuthorizationGuard.CACHE_TTL_SECONDS,
    );

    return permissionSet;
  }
}
