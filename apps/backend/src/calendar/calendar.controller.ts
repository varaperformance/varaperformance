import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../idm/decorators/permissions.decorator';
import { ActiveUser } from '../idm/decorators/active-user.decorator';
import { CalendarService } from './calendar.service';
import {
  CalendarRangeQueryDto,
  CalendarUserParamsDto,
  CreateCalendarEventDto,
  EventIdParamsDto,
  UpdateCalendarEventDto,
} from './dto/calendar.dto';

@ApiTags('calendar')
@Controller({
  path: 'calendar',
  version: '1',
})
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List my calendar events in a date range' })
  @ApiOkResponse({ description: 'Calendar occurrences' })
  @Permissions('calendar:read')
  @Get('events')
  getMyEvents(
    @ActiveUser('sub') userId: string,
    @Query() query: CalendarRangeQueryDto,
  ) {
    return this.calendarService.getEventsForCalendarView(
      userId,
      userId,
      query.start,
      query.end,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'List another user calendar events in a date range (coach-client relationship required)',
  })
  @ApiOkResponse({
    description: 'Calendar occurrences with private events masked',
  })
  @Permissions('calendar:read')
  @Get('users/:userId/events')
  getUserEvents(
    @ActiveUser('sub') viewerUserId: string,
    @Param() params: CalendarUserParamsDto,
    @Query() query: CalendarRangeQueryDto,
  ) {
    return this.calendarService.getEventsForCalendarView(
      viewerUserId,
      params.userId,
      query.start,
      query.end,
    );
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'List users associated through coach-client bookings for meeting selection',
  })
  @ApiOkResponse({ description: 'Associated users list' })
  @Permissions('calendar:read')
  @Get('associations')
  getAssociations(@ActiveUser('sub') userId: string) {
    return this.calendarService.getAssociatedUsers(userId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create an event or meeting' })
  @ApiOkResponse({ description: 'Created event' })
  @Permissions('calendar:create')
  @Post('events')
  createEvent(
    @ActiveUser('sub') userId: string,
    @Body() dto: CreateCalendarEventDto,
  ) {
    return this.calendarService.createEvent(userId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update one of my events' })
  @ApiOkResponse({ description: 'Updated event' })
  @Permissions('calendar:update')
  @Patch('events/:eventId')
  updateEvent(
    @ActiveUser('sub') userId: string,
    @Param() params: EventIdParamsDto,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.updateEvent(userId, params.eventId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete one of my events' })
  @ApiOkResponse({ description: 'Event deleted' })
  @Permissions('calendar:delete')
  @Delete('events/:eventId')
  deleteEvent(
    @ActiveUser('sub') userId: string,
    @Param() params: EventIdParamsDto,
  ) {
    return this.calendarService.deleteEvent(userId, params.eventId);
  }
}
