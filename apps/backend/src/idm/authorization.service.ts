import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database/database.service';
import { RedisService } from '@app/database/redis.service';
import { SuccessResponse } from '@varaperformance/core';

@Injectable()
export class AuthorizationService {
  constructor(
    private readonly prismaService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  /** Invalidate the cached permission set for a user. */
  async invalidatePermissionCache(userId: string): Promise<void> {
    await this.redisService.del(`permissions:${userId}`);
  }

  // ==================== ROLES ====================

  async createRole(
    name: string,
    description?: string,
  ): Promise<SuccessResponse> {
    const role = await this.prismaService.role.create({
      data: { name, description },
    });
    return { success: true, data: role };
  }

  async getAllRoles(): Promise<SuccessResponse> {
    const roles = await this.prismaService.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });
    return { success: true, data: roles };
  }

  async deleteRole(roleId: string): Promise<SuccessResponse> {
    await this.prismaService.role.delete({ where: { id: roleId } });
    return { success: true, data: { deleted: true } };
  }

  // ==================== PERMISSIONS ====================

  async createPermission(
    resource: string,
    action: string,
    description?: string,
  ): Promise<SuccessResponse> {
    const permission = await this.prismaService.permission.create({
      data: { resource, action, description },
    });
    return { success: true, data: permission };
  }

  async getAllPermissions(): Promise<SuccessResponse> {
    const permissions = await this.prismaService.permission.findMany();
    return { success: true, data: permissions };
  }

  async deletePermission(permissionId: string): Promise<SuccessResponse> {
    await this.prismaService.permission.delete({ where: { id: permissionId } });
    return { success: true, data: { deleted: true } };
  }

  // ==================== ROLE-PERMISSION ASSIGNMENT ====================

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<SuccessResponse> {
    const rolePermission = await this.prismaService.rolePermission.create({
      data: { roleId, permissionId },
      include: { role: true, permission: true },
    });
    return { success: true, data: rolePermission };
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<SuccessResponse> {
    await this.prismaService.rolePermission.delete({
      where: { roleId_permissionId: { roleId, permissionId } },
    });
    return { success: true, data: { deleted: true } };
  }

  // ==================== USER-ROLE ASSIGNMENT ====================

  async assignRoleToUser(
    userId: string,
    roleId: string,
  ): Promise<SuccessResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const role = await this.prismaService.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException(`Role ${roleId} not found`);
    }

    const userRole = await this.prismaService.userRole.create({
      data: { userId, roleId },
      include: { user: true, role: true },
    });
    await this.invalidatePermissionCache(userId);
    return { success: true, data: userRole };
  }

  async removeRoleFromUser(
    userId: string,
    roleId: string,
  ): Promise<SuccessResponse> {
    await this.prismaService.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
    await this.invalidatePermissionCache(userId);
    return { success: true, data: { deleted: true } };
  }

  // ==================== USER-PERMISSION ASSIGNMENT (Direct) ====================

  async assignPermissionToUser(
    userId: string,
    permissionId: string,
  ): Promise<SuccessResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const permission = await this.prismaService.permission.findUnique({
      where: { id: permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission ${permissionId} not found`);
    }

    const userPermission = await this.prismaService.userPermission.create({
      data: { userId, permissionId },
      include: { user: true, permission: true },
    });
    await this.invalidatePermissionCache(userId);
    return { success: true, data: userPermission };
  }

  async removePermissionFromUser(
    userId: string,
    permissionId: string,
  ): Promise<SuccessResponse> {
    await this.prismaService.userPermission.delete({
      where: { userId_permissionId: { userId, permissionId } },
    });
    await this.invalidatePermissionCache(userId);
    return { success: true, data: { deleted: true } };
  }

  // ==================== USER PERMISSIONS QUERY ====================

  async getUserPermissions(userId: string): Promise<SuccessResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Collect all permissions
    const permissionsSet = new Set<string>();
    const permissionsList: Array<{ resource: string; action: string }> = [];

    // From roles
    for (const userRole of user.roles) {
      for (const rp of userRole.role.permissions) {
        const key = `${rp.permission.resource}:${rp.permission.action}`;
        if (!permissionsSet.has(key)) {
          permissionsSet.add(key);
          permissionsList.push({
            resource: rp.permission.resource,
            action: rp.permission.action,
          });
        }
      }
    }

    // Direct permissions
    for (const up of user.permissions) {
      const key = `${up.permission.resource}:${up.permission.action}`;
      if (!permissionsSet.has(key)) {
        permissionsSet.add(key);
        permissionsList.push({
          resource: up.permission.resource,
          action: up.permission.action,
        });
      }
    }

    return {
      success: true,
      data: {
        roles: user.roles.map((ur) => ur.role.name),
        permissions: permissionsList,
      },
    };
  }
}
