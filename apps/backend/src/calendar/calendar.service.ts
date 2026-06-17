import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import type {
  CalendarOccurrence,
  CreateCalendarEvent,
  RecurrenceFrequency,
  SuccessResponse,
  UpdateCalendarEvent,
} from '@varaperformance/core';
import {
  BookingStatus,
  CalendarEventType,
  CalendarEventVisibility,
  Prisma,
} from '../generated/prisma/client';
import {
  calendarEventOwnershipSelect,
  calendarEventSelect,
} from './selectors/calendar.selector';

type CalendarEventRecord = Prisma.CalendarEventGetPayload<{
  select: typeof calendarEventSelect;
}>;

const MAX_RANGE_DAYS = 180;
const MAX_OCCURRENCES_PER_EVENT = 500;

@Injectable()
export class CalendarService {
  constructor(private readonly db: DatabaseService) {}

  async getAssociatedUsers(userId: string): Promise<
    SuccessResponse<{
      items: Array<{
        userId: string;
        role: 'coach' | 'client';
        displayName: string | null;
        email: string;
      }>;
    }>
  > {
    const bookings = await this.db.booking.findMany({
      where: {
        status: {
          in: [BookingStatus.APPROVED, BookingStatus.CONFIRMED],
        },
        OR: [{ userId }, { coach: { userId } }],
      },
      select: {
        userId: true,
        user: {
          select: {
            email: true,
            profile: { select: { displayName: true } },
          },
        },
        coach: {
          select: {
            userId: true,
            user: {
              select: {
                email: true,
                profile: { select: { displayName: true } },
              },
            },
          },
        },
      },
    });

    const byUser = new Map<
      string,
      {
        userId: string;
        role: 'coach' | 'client';
        displayName: string | null;
        email: string;
      }
    >();

    for (const booking of bookings) {
      const bookingUserIsCurrent = booking.userId === userId;

      if (bookingUserIsCurrent) {
        const coachUserId = booking.coach.userId;
        if (coachUserId !== userId) {
          byUser.set(coachUserId, {
            userId: coachUserId,
            role: 'coach',
            displayName: booking.coach.user.profile?.displayName ?? null,
            email: booking.coach.user.email,
          });
        }
      } else {
        if (booking.userId !== userId) {
          byUser.set(booking.userId, {
            userId: booking.userId,
            role: 'client',
            displayName: booking.user.profile?.displayName ?? null,
            email: booking.user.email,
          });
        }
      }
    }

    return {
      success: true as const,
      data: {
        items: [...byUser.values()].sort((a, b) =>
          (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email),
        ),
      },
    };
  }

  async getEventsForCalendarView(
    viewerUserId: string,
    targetUserId: string,
    startIso: string,
    endIso: string,
  ): Promise<SuccessResponse<{ items: CalendarOccurrence[] }>> {
    const { start, end } = this.parseRange(startIso, endIso);

    if (viewerUserId !== targetUserId) {
      const canView = await this.usersCanScheduleTogether(
        viewerUserId,
        targetUserId,
      );
      if (!canView) {
        throw new ForbiddenException(
          'You can only view calendars for your own coach-client relationships',
        );
      }
    }

    const events = await this.db.calendarEvent.findMany({
      where: {
        OR: [
          { ownerUserId: targetUserId },
          { participantUserId: targetUserId },
        ],
        // Pre-filter at DB level: event must start before range end to
        // have any occurrences in the queried window. Non-recurring events
        // that end before range start are also pruned.
        startAt: { lte: end },
      },
      select: calendarEventSelect,
      orderBy: { startAt: 'asc' },
    });

    const items = events
      .flatMap((event) =>
        this.expandEventInRange(event, start, end, viewerUserId),
      )
      .sort(
        (a, b) =>
          new Date(a.occurrenceStart).getTime() -
          new Date(b.occurrenceStart).getTime(),
      );

    return {
      success: true as const,
      data: { items },
    };
  }

  async createEvent(
    ownerUserId: string,
    payload: CreateCalendarEvent,
  ): Promise<SuccessResponse<{ id: string }>> {
    this.validateEventTimes(payload.startAt, payload.endAt);
    this.validateParticipantAndType(payload.type, payload.participantUserId);

    if (payload.participantUserId) {
      const canSchedule = await this.usersCanScheduleTogether(
        ownerUserId,
        payload.participantUserId,
      );
      if (!canSchedule) {
        throw new ForbiddenException(
          'Meetings can only be scheduled between connected coach-client users',
        );
      }
    }

    const created = await this.db.calendarEvent.create({
      data: {
        ownerUserId,
        participantUserId: payload.participantUserId ?? null,
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        location: payload.location?.trim() || null,
        type: payload.type,
        visibility: payload.visibility,
        allDay: payload.allDay ?? false,
        startAt: new Date(payload.startAt),
        endAt: new Date(payload.endAt),
        timezone: payload.timezone,
        recurrenceFrequency: payload.recurrence?.frequency ?? null,
        recurrenceInterval: payload.recurrence?.interval ?? 1,
        recurrenceByWeekday: payload.recurrence?.byWeekday ?? [],
        recurrenceUntil: payload.recurrence?.until
          ? new Date(payload.recurrence.until)
          : null,
        recurrenceCount: payload.recurrence?.count ?? null,
      },
      select: { id: true },
    });

    return {
      success: true as const,
      data: { id: created.id },
    };
  }

  async updateEvent(
    userId: string,
    eventId: string,
    payload: UpdateCalendarEvent,
  ): Promise<SuccessResponse<{ id: string }>> {
    const existing = await this.db.calendarEvent.findUnique({
      where: { id: eventId },
      select: calendarEventOwnershipSelect,
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    if (existing.ownerUserId !== userId) {
      throw new ForbiddenException('You can only update your own events');
    }

    const nextStart = payload.startAt
      ? new Date(payload.startAt)
      : existing.startAt;
    const nextEnd = payload.endAt ? new Date(payload.endAt) : existing.endAt;

    if (nextStart.getTime() >= nextEnd.getTime()) {
      throw new BadRequestException('startAt must be before endAt');
    }

    const nextType = payload.type ?? existing.type;
    const nextParticipantUserId =
      payload.participantUserId !== undefined
        ? payload.participantUserId
        : existing.participantUserId;

    if (nextParticipantUserId) {
      const canSchedule = await this.usersCanScheduleTogether(
        userId,
        nextParticipantUserId,
      );
      if (!canSchedule) {
        throw new ForbiddenException(
          'Meetings can only be scheduled between connected coach-client users',
        );
      }
    }

    this.validateParticipantAndType(
      nextType,
      nextParticipantUserId ?? undefined,
    );

    await this.db.calendarEvent.update({
      where: { id: eventId },
      data: {
        title: payload.title?.trim(),
        description: payload.description?.trim() || undefined,
        location: payload.location?.trim() || undefined,
        type: payload.type,
        visibility: payload.visibility,
        allDay: payload.allDay,
        startAt: payload.startAt ? new Date(payload.startAt) : undefined,
        endAt: payload.endAt ? new Date(payload.endAt) : undefined,
        timezone: payload.timezone,
        participantUserId: payload.participantUserId,
        recurrenceFrequency: payload.recurrence?.frequency,
        recurrenceInterval: payload.recurrence?.interval,
        recurrenceByWeekday: payload.recurrence?.byWeekday,
        recurrenceUntil: payload.recurrence?.until
          ? new Date(payload.recurrence.until)
          : undefined,
        recurrenceCount: payload.recurrence?.count,
      },
      select: { id: true },
    });

    return {
      success: true as const,
      data: { id: eventId },
    };
  }

  async deleteEvent(
    userId: string,
    eventId: string,
  ): Promise<SuccessResponse<{ id: string }>> {
    const existing = await this.db.calendarEvent.findUnique({
      where: { id: eventId },
      select: { id: true, ownerUserId: true },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    if (existing.ownerUserId !== userId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    await this.db.calendarEvent.delete({ where: { id: eventId } });

    return {
      success: true as const,
      data: { id: eventId },
    };
  }

  private parseRange(
    startIso: string,
    endIso: string,
  ): {
    start: Date;
    end: Date;
  } {
    const start = new Date(startIso);
    const end = new Date(endIso);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    if (start.getTime() >= end.getTime()) {
      throw new BadRequestException('start must be before end');
    }

    const rangeDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Range cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }

    return { start, end };
  }

  private validateEventTimes(startIso: string, endIso: string): void {
    const start = new Date(startIso);
    const end = new Date(endIso);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start.getTime() >= end.getTime()
    ) {
      throw new BadRequestException('startAt must be before endAt');
    }
  }

  private validateParticipantAndType(
    type?: CalendarEventType,
    participantUserId?: string,
  ): void {
    if (type === CalendarEventType.MEETING && !participantUserId) {
      throw new BadRequestException('Meeting events require participantUserId');
    }

    if (participantUserId && type === CalendarEventType.EVENT) {
      throw new BadRequestException(
        'participantUserId can only be used with MEETING events',
      );
    }
  }

  private async usersCanScheduleTogether(
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    if (firstUserId === secondUserId) {
      return true;
    }

    const booking = await this.db.booking.findFirst({
      where: {
        status: {
          in: [BookingStatus.APPROVED, BookingStatus.CONFIRMED],
        },
        OR: [
          {
            userId: firstUserId,
            coach: { userId: secondUserId },
          },
          {
            userId: secondUserId,
            coach: { userId: firstUserId },
          },
        ],
      },
      select: { id: true },
    });

    return Boolean(booking);
  }

  private expandEventInRange(
    event: CalendarEventRecord,
    rangeStart: Date,
    rangeEnd: Date,
    viewerUserId: string,
  ): CalendarOccurrence[] {
    const isRecurring = Boolean(event.recurrenceFrequency);
    if (!isRecurring) {
      if (!this.overlaps(event.startAt, event.endAt, rangeStart, rangeEnd)) {
        return [];
      }
      return [
        this.toOccurrence(
          event,
          event.startAt,
          event.endAt,
          viewerUserId,
          false,
        ),
      ];
    }

    if (!event.recurrenceFrequency) {
      return [];
    }

    switch (event.recurrenceFrequency) {
      case 'DAILY':
        return this.expandBySimpleStep(
          event,
          rangeStart,
          rangeEnd,
          viewerUserId,
          event.recurrenceFrequency,
        );
      case 'MONTHLY':
        return this.expandBySimpleStep(
          event,
          rangeStart,
          rangeEnd,
          viewerUserId,
          event.recurrenceFrequency,
        );
      case 'YEARLY':
        return this.expandBySimpleStep(
          event,
          rangeStart,
          rangeEnd,
          viewerUserId,
          event.recurrenceFrequency,
        );
      case 'WEEKLY':
        return this.expandWeekly(event, rangeStart, rangeEnd, viewerUserId);
      default:
        return [];
    }
  }

  private expandBySimpleStep(
    event: CalendarEventRecord,
    rangeStart: Date,
    rangeEnd: Date,
    viewerUserId: string,
    frequency: RecurrenceFrequency,
  ): CalendarOccurrence[] {
    const items: CalendarOccurrence[] = [];
    const durationMs = event.endAt.getTime() - event.startAt.getTime();
    const interval = Math.max(1, event.recurrenceInterval || 1);

    let current = new Date(event.startAt);
    let emitted = 0;
    let occurrenceIndex = 1;

    while (emitted < MAX_OCCURRENCES_PER_EVENT) {
      if (event.recurrenceCount && occurrenceIndex > event.recurrenceCount) {
        break;
      }

      if (
        event.recurrenceUntil &&
        current.getTime() > event.recurrenceUntil.getTime()
      ) {
        break;
      }

      if (current.getTime() > rangeEnd.getTime()) {
        break;
      }

      const currentEnd = new Date(current.getTime() + durationMs);
      if (this.overlaps(current, currentEnd, rangeStart, rangeEnd)) {
        items.push(
          this.toOccurrence(event, current, currentEnd, viewerUserId, true),
        );
      }

      current = this.incrementByFrequency(current, interval, frequency);
      emitted += 1;
      occurrenceIndex += 1;
    }

    return items;
  }

  private expandWeekly(
    event: CalendarEventRecord,
    rangeStart: Date,
    rangeEnd: Date,
    viewerUserId: string,
  ): CalendarOccurrence[] {
    const items: CalendarOccurrence[] = [];
    const durationMs = event.endAt.getTime() - event.startAt.getTime();
    const interval = Math.max(1, event.recurrenceInterval || 1);

    const weekdays =
      event.recurrenceByWeekday.length > 0
        ? [...new Set(event.recurrenceByWeekday)].sort((a, b) => a - b)
        : [event.startAt.getUTCDay()];

    const baseWeek = this.startOfWeekUtc(event.startAt);
    let weekOffset = 0;
    let emitted = 0;
    let occurrenceIndex = 1;

    while (emitted < MAX_OCCURRENCES_PER_EVENT) {
      const weekStart = this.addDays(baseWeek, weekOffset * interval * 7);

      for (const weekday of weekdays) {
        const day = this.addDays(weekStart, weekday);
        const candidateStart = this.withTimeOf(day, event.startAt);

        if (candidateStart.getTime() < event.startAt.getTime()) {
          continue;
        }

        if (event.recurrenceCount && occurrenceIndex > event.recurrenceCount) {
          return items;
        }

        if (
          event.recurrenceUntil &&
          candidateStart.getTime() > event.recurrenceUntil.getTime()
        ) {
          return items;
        }

        if (candidateStart.getTime() > rangeEnd.getTime()) {
          return items;
        }

        const candidateEnd = new Date(candidateStart.getTime() + durationMs);
        if (this.overlaps(candidateStart, candidateEnd, rangeStart, rangeEnd)) {
          items.push(
            this.toOccurrence(
              event,
              candidateStart,
              candidateEnd,
              viewerUserId,
              true,
            ),
          );
        }

        occurrenceIndex += 1;
      }

      weekOffset += 1;
      emitted += 1;
    }

    return items;
  }

  private toOccurrence(
    event: CalendarEventRecord,
    occurrenceStart: Date,
    occurrenceEnd: Date,
    viewerUserId: string,
    isRecurring: boolean,
  ): CalendarOccurrence {
    const viewerIsParticipant =
      viewerUserId === event.ownerUserId ||
      viewerUserId === event.participantUserId;
    const shouldMask =
      event.visibility === CalendarEventVisibility.PRIVATE &&
      !viewerIsParticipant;

    return {
      id: `${event.id}:${occurrenceStart.toISOString()}`,
      eventId: event.id,
      ownerUserId: event.ownerUserId,
      participantUserId: event.participantUserId,
      title: shouldMask ? 'Busy' : event.title,
      description: shouldMask ? null : event.description,
      location: shouldMask ? null : event.location,
      type: event.type,
      visibility: event.visibility,
      allDay: event.allDay,
      isPrivateMasked: shouldMask,
      isRecurring,
      occurrenceStart: occurrenceStart.toISOString(),
      occurrenceEnd: occurrenceEnd.toISOString(),
      timezone: event.timezone,
    };
  }

  private overlaps(
    eventStart: Date,
    eventEnd: Date,
    rangeStart: Date,
    rangeEnd: Date,
  ): boolean {
    return (
      eventStart.getTime() < rangeEnd.getTime() &&
      eventEnd.getTime() > rangeStart.getTime()
    );
  }

  private incrementByFrequency(
    date: Date,
    interval: number,
    frequency: RecurrenceFrequency,
  ): Date {
    const next = new Date(date);
    if (frequency === 'DAILY') {
      next.setUTCDate(next.getUTCDate() + interval);
      return next;
    }
    if (frequency === 'MONTHLY') {
      next.setUTCMonth(next.getUTCMonth() + interval);
      return next;
    }
    next.setUTCFullYear(next.getUTCFullYear() + interval);
    return next;
  }

  private startOfWeekUtc(date: Date): Date {
    const copy = new Date(date);
    copy.setUTCHours(0, 0, 0, 0);
    copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay());
    return copy;
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  private withTimeOf(date: Date, sourceTime: Date): Date {
    const copy = new Date(date);
    copy.setUTCHours(
      sourceTime.getUTCHours(),
      sourceTime.getUTCMinutes(),
      sourceTime.getUTCSeconds(),
      sourceTime.getUTCMilliseconds(),
    );
    return copy;
  }
}
