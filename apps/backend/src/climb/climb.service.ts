import { Injectable, NotFoundException } from '@nestjs/common';
import {
  createUtcDateKey,
  createTimestampForDate,
  getEffectiveTimezone,
  getTodayInTimezone,
  type ClimbCategory,
  type SuccessResponse,
} from '@varaperformance/core';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { HabitsService } from '../health/habits/habits.service';
import { JwtPayload } from 'src/idm/interfaces/jwt.interface';
import { ClimbEntriesQueryDto, CreateClimbEntryDto } from './dto/climb.dto';
import { climbEntrySelector } from './selectors/climb.selector';

interface ClimbEntriesQueryPayload {
  category?: ClimbCategory;
  fromDate?: string;
  toDate?: string;
  limit: number;
}

interface CreateClimbEntryPayload {
  category: ClimbCategory;
  imageUrl: string;
  note?: string;
  capturedDate?: string;
}

@Injectable()
export class ClimbService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly habitsService: HabitsService,
  ) {}

  async getEntries(
    user: JwtPayload,
    query: ClimbEntriesQueryDto,
  ): Promise<SuccessResponse<any>> {
    const profile = await this.db.profile.findUnique({
      where: { userId: user.sub },
      select: { timezone: true },
    });

    const timezone = getEffectiveTimezone(profile?.timezone);
    const where: {
      userId: string;
      category?: ClimbCategory;
      capturedDate?: { gte?: Date; lte?: Date };
    } = { userId: user.sub };

    const queryData = query as unknown as ClimbEntriesQueryPayload;

    if (queryData.category) {
      where.category = queryData.category;
    }

    if (queryData.fromDate || queryData.toDate) {
      where.capturedDate = {};
      if (queryData.fromDate) {
        where.capturedDate.gte = this.parseDateOnly(queryData.fromDate);
      }
      if (queryData.toDate) {
        where.capturedDate.lte = this.parseDateOnly(queryData.toDate);
      }
    }

    const items = await this.db.climbEntry.findMany({
      where,
      orderBy: [{ capturedDate: 'asc' }, { category: 'asc' }],
      take: queryData.limit,
      select: climbEntrySelector,
    });

    return {
      success: true,
      data: {
        items,
        limit: queryData.limit,
        timezone,
        todayDate: getTodayInTimezone(timezone),
      },
    };
  }

  async upsertEntry(
    user: JwtPayload,
    data: CreateClimbEntryDto,
  ): Promise<SuccessResponse<any>> {
    const profile = await this.db.profile.findUnique({
      where: { userId: user.sub },
      select: { timezone: true },
    });

    const payload = data as unknown as CreateClimbEntryPayload;
    const category = payload.category ?? 'DAILY';
    const timezone = getEffectiveTimezone(profile?.timezone);
    const dateKey = payload.capturedDate ?? getTodayInTimezone(timezone);
    const capturedDate = this.parseDateOnly(dateKey);
    const capturedAt = new Date(createTimestampForDate(dateKey, timezone, 12));

    const entry = await this.db.climbEntry.upsert({
      where: {
        userId_capturedDate_category: {
          userId: user.sub,
          capturedDate,
          category,
        },
      },
      update: {
        category,
        imageUrl: payload.imageUrl,
        note: payload.note,
        capturedAt,
        ...this.encryptClimbContent(payload.imageUrl, payload.note),
      },
      create: {
        userId: user.sub,
        category,
        imageUrl: payload.imageUrl,
        note: payload.note,
        capturedDate,
        capturedAt,
        ...this.encryptClimbContent(payload.imageUrl, payload.note),
      },
      select: climbEntrySelector,
    });

    // Auto-complete linked CLIMB habits
    this.habitsService
      .autoCompleteLinkedHabits(user.sub, 'CLIMB', dateKey)
      .catch(() => {});

    return {
      success: true,
      data: entry,
      message: 'Climb entry saved',
    };
  }

  async deleteEntry(
    user: JwtPayload,
    id: string,
  ): Promise<SuccessResponse<any>> {
    const existing = await this.db.climbEntry.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing || existing.userId !== user.sub) {
      throw new NotFoundException('Climb entry not found');
    }

    await this.db.climbEntry.delete({ where: { id } });

    return {
      success: true,
      data: { deleted: true },
    };
  }

  private parseDateOnly(dateStr: string): Date {
    return createUtcDateKey(dateStr);
  }

  private encryptClimbContent(imageUrl: string, note?: string | null) {
    const payload = JSON.stringify({ imageUrl, note });
    const enc = this.encryption.encrypt(payload);
    return {
      eClimbContent: enc.encryptedContent,
      climbContentIv: enc.contentIv,
      climbContentAuthTag: enc.contentAuthTag,
      climbContentWrappedKey: enc.wrappedKey,
    };
  }
}
