import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { availabilitySlotSelect } from './selectors/availability.selector';
import type {
  CreateAvailability,
  UpdateAvailability,
} from '@varaperformance/core';

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Get all availability slots for a coach (public)
   */
  async getCoachAvailability(coachId: string) {
    return await this.db.coachAvailability.findMany({
      where: { coachId, isActive: true },
      select: availabilitySlotSelect,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Get a coach's own availability (all slots, including inactive)
   */
  async getMyAvailability(userId: string) {
    const coach = await this.resolveCoach(userId);
    return this.db.coachAvailability.findMany({
      where: { coachId: coach.id },
      select: availabilitySlotSelect,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Create a new availability slot
   */
  async createSlot(userId: string, data: CreateAvailability) {
    const coach = await this.resolveCoach(userId);
    return this.db.coachAvailability.create({
      data: {
        coachId: coach.id,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
      },
      select: availabilitySlotSelect,
    });
  }

  /**
   * Update an availability slot
   */
  async updateSlot(userId: string, slotId: string, data: UpdateAvailability) {
    const coach = await this.resolveCoach(userId);
    const slot = await this.db.coachAvailability.findUnique({
      where: { id: slotId },
      select: { coachId: true },
    });

    if (!slot) throw new NotFoundException('Availability slot not found');
    if (slot.coachId !== coach.id)
      throw new ForbiddenException('Not your availability slot');

    return this.db.coachAvailability.update({
      where: { id: slotId },
      data,
      select: availabilitySlotSelect,
    });
  }

  /**
   * Delete an availability slot
   */
  async deleteSlot(userId: string, slotId: string) {
    const coach = await this.resolveCoach(userId);
    const slot = await this.db.coachAvailability.findUnique({
      where: { id: slotId },
      select: { coachId: true },
    });

    if (!slot) throw new NotFoundException('Availability slot not found');
    if (slot.coachId !== coach.id)
      throw new ForbiddenException('Not your availability slot');

    await this.db.coachAvailability.delete({ where: { id: slotId } });
  }

  private async resolveCoach(userId: string) {
    const coach = await this.db.coach.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!coach) throw new NotFoundException('Coach profile not found');
    return coach;
  }
}
