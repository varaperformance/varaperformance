import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { NotificationService } from './notification.service';
import { ActiveUser } from '../idm/decorators/active-user.decorator';
import { Permissions } from '../idm/decorators/permissions.decorator';
import { Public } from '../idm/decorators/public.decorator';
import {
  InternalApiGuard,
  InternalEndpoint,
} from '../idm/guards/internal/internal-api.guard';
import {
  NotificationQuerySchema,
  MarkNotificationsReadSchema,
  UpdateNotificationPreferencesSchema,
} from '@varaperformance/core';
import { z } from 'zod';
import { Throttle } from '@nestjs/throttler';

class NotificationQueryDto extends createZodDto(NotificationQuerySchema) {}
class MarkNotificationsReadDto extends createZodDto(
  MarkNotificationsReadSchema,
) {}
class InternalPushNotificationDto extends createZodDto(
  z.object({ notificationId: z.string().uuid() }),
) {}
class UpdateNotificationPreferencesDto extends createZodDto(
  UpdateNotificationPreferencesSchema,
) {}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({
  path: 'notifications',
  version: '1',
})
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get notifications for the current user' })
  @ApiOkResponse({ description: 'List of notifications with unread count' })
  @Throttle({ default: { ttl: 60000, limit: 180 } })
  @Permissions('notification:read')
  @Get()
  async getNotifications(
    @ActiveUser('sub') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getNotifications(
      userId,
      query.limit,
      query.cursor,
      query.unreadOnly,
    );
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiOkResponse({ description: 'Unread count' })
  @Throttle({ default: { ttl: 60000, limit: 180 } })
  @Permissions('notification:read')
  @Get('unread-count')
  async getUnreadCount(@ActiveUser('sub') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @ApiOperation({ summary: 'Mark specific notifications as read' })
  @ApiOkResponse({ description: 'Number of notifications marked as read' })
  @Permissions('notification:update')
  @HttpCode(HttpStatus.OK)
  @Post('mark-read')
  async markAsRead(
    @ActiveUser('sub') userId: string,
    @Body() body: MarkNotificationsReadDto,
  ) {
    return this.notificationService.markAsRead(userId, body.notificationIds);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ description: 'Number of notifications marked as read' })
  @Permissions('notification:update')
  @HttpCode(HttpStatus.OK)
  @Post('mark-all-read')
  async markAllAsRead(@ActiveUser('sub') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiOkResponse({ description: 'Notification preference settings' })
  @Throttle({ default: { ttl: 60000, limit: 180 } })
  @Permissions('notification:read')
  @Get('preferences')
  async getPreferences(@ActiveUser('sub') userId: string) {
    return this.notificationService.getPreferences(userId);
  }

  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiOkResponse({ description: 'Updated notification preference settings' })
  @Permissions('notification:update')
  @HttpCode(HttpStatus.OK)
  @Put('preferences')
  async updatePreferences(
    @ActiveUser('sub') userId: string,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationService.updatePreferences(userId, body);
  }

  @ApiOperation({ summary: 'Internal: push notification over WebSocket' })
  @ApiOkResponse({ description: 'Push result' })
  @Public()
  @InternalEndpoint()
  @UseGuards(InternalApiGuard)
  @HttpCode(HttpStatus.OK)
  @Post('internal/push')
  async pushNotificationInternal(@Body() body: InternalPushNotificationDto) {
    const pushed = await this.notificationService.pushExistingNotification(
      body.notificationId,
    );
    return { success: true, data: { pushed } };
  }
}
