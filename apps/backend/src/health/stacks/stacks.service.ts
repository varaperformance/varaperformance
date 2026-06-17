import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { HabitsService } from '../habits/habits.service';
import type {
  CreateStack,
  UpdateStack,
  AddStackItem,
  UpdateStackItem,
  BatchUpdateItems,
  StackResponse,
  StackListItem,
  StackItemResponse,
  DailyLogResponse,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';

@Injectable()
export class StacksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly habitsService: HabitsService,
  ) {}

  /**
   * Create a new stack
   * If this is the user's first stack, it will be automatically activated
   */
  async create(
    userId: string,
    data: CreateStack,
  ): Promise<SuccessResponse<StackResponse>> {
    // Check if user has any existing stacks
    const existingCount = await this.db.stack.count({ where: { userId } });
    const shouldActivate = existingCount === 0;

    const stack = await this.db.stack.create({
      data: {
        userId,
        name: data.name,
        isActive: shouldActivate,
        items: data.items
          ? {
              create: data.items.map((item) => ({
                name: item.name,
                dosage: item.dosage,
                timeSlot: item.timeSlot ?? null,
                notes: item.notes ?? null,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    return { success: true, data: this.formatStackResponse(stack) };
  }

  /**
   * Get all stacks for a user
   */
  async findAll(userId: string): Promise<SuccessResponse<StackListItem[]>> {
    const stacks = await this.db.stack.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
      include: { _count: { select: { items: true } } },
    });

    return {
      success: true,
      data: stacks.map((stack) => ({
        id: stack.id,
        name: stack.name,
        isActive: stack.isActive,
        itemCount: stack._count.items,
        createdAt: stack.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get active stack for a user
   */
  async findActive(
    userId: string,
  ): Promise<SuccessResponse<StackResponse | null>> {
    const stack = await this.db.stack.findFirst({
      where: { userId, isActive: true },
      include: {
        items: { orderBy: [{ timeSlot: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    return {
      success: true,
      data: stack ? this.formatStackResponse(stack) : null,
    };
  }

  /**
   * Get a single stack by ID
   */
  async findOne(
    userId: string,
    stackId: string,
  ): Promise<SuccessResponse<StackResponse> | ErrorResponse> {
    const stack = await this.db.stack.findFirst({
      where: { id: stackId, userId },
      include: {
        items: { orderBy: [{ timeSlot: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    if (!stack) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stack not found' },
      };
    }

    return { success: true, data: this.formatStackResponse(stack) };
  }

  /**
   * Update a stack
   */
  async update(
    userId: string,
    stackId: string,
    data: UpdateStack,
  ): Promise<SuccessResponse<StackResponse> | ErrorResponse> {
    const existing = await this.db.stack.findFirst({
      where: { id: stackId, userId },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stack not found' },
      };
    }

    const stack = await this.db.stack.update({
      where: { id: stackId },
      data: { name: data.name },
      include: {
        items: { orderBy: [{ timeSlot: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    return { success: true, data: this.formatStackResponse(stack) };
  }

  /**
   * Delete a stack
   */
  async remove(
    userId: string,
    stackId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const existing = await this.db.stack.findFirst({
      where: { id: stackId, userId },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stack not found' },
      };
    }

    await this.db.stack.delete({ where: { id: stackId } });

    return { success: true, data: { deleted: true } };
  }

  /**
   * Set a stack as active (deactivates all others)
   */
  async setActive(
    userId: string,
    stackId: string,
  ): Promise<SuccessResponse<StackResponse> | ErrorResponse> {
    const existing = await this.db.stack.findFirst({
      where: { id: stackId, userId },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stack not found' },
      };
    }

    // Deactivate all stacks for this user, then activate the selected one
    await this.db.$transaction([
      this.db.stack.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      }),
      this.db.stack.update({
        where: { id: stackId },
        data: { isActive: true },
      }),
    ]);

    const stack = await this.db.stack.findUnique({
      where: { id: stackId },
      include: {
        items: { orderBy: [{ timeSlot: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    return {
      success: true,
      data: this.formatStackResponse(
        stack! as Parameters<typeof this.formatStackResponse>[0],
      ),
    };
  }

  // ========== Stack Items ==========

  /**
   * Add an item to a stack
   */
  async addItem(
    userId: string,
    stackId: string,
    data: AddStackItem,
  ): Promise<SuccessResponse<StackItemResponse> | ErrorResponse> {
    const stack = await this.db.stack.findFirst({
      where: { id: stackId, userId },
    });

    if (!stack) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stack not found' },
      };
    }

    const item = await this.db.stackItem.create({
      data: {
        stackId,
        name: data.name,
        dosage: data.dosage,
        timeSlot: data.timeSlot ?? null,
        notes: data.notes ?? null,
        ...this.encryptStackItem(data.name, data.dosage, data.notes),
      },
    });

    return { success: true, data: this.formatItemResponse(item) };
  }

  /**
   * Update an item in a stack
   */
  async updateItem(
    userId: string,
    stackId: string,
    itemId: string,
    data: UpdateStackItem,
  ): Promise<SuccessResponse<StackItemResponse> | ErrorResponse> {
    const item = await this.db.stackItem.findFirst({
      where: { id: itemId, stackId, stack: { userId } },
    });

    if (!item) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item not found' },
      };
    }

    const updated = await this.db.stackItem.update({
      where: { id: itemId },
      data: {
        name: data.name,
        dosage: data.dosage,
        timeSlot: data.timeSlot,
        notes: data.notes,
        ...this.encryptStackItem(
          data.name ?? item.name,
          data.dosage ?? item.dosage,
          data.notes ?? item.notes,
        ),
      },
    });

    return { success: true, data: this.formatItemResponse(updated) };
  }

  /**
   * Delete an item from a stack
   */
  async removeItem(
    userId: string,
    stackId: string,
    itemId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const item = await this.db.stackItem.findFirst({
      where: { id: itemId, stackId, stack: { userId } },
    });

    if (!item) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item not found' },
      };
    }

    await this.db.stackItem.delete({ where: { id: itemId } });

    return { success: true, data: { deleted: true } };
  }

  /**
   * Batch update items (for scheduling/reordering)
   */
  async batchUpdateItems(
    userId: string,
    stackId: string,
    data: BatchUpdateItems,
  ): Promise<SuccessResponse<StackResponse> | ErrorResponse> {
    const stack = await this.db.stack.findFirst({
      where: { id: stackId, userId },
    });

    if (!stack) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stack not found' },
      };
    }

    // Update each item's timeSlot
    await this.db.$transaction(
      data.items.map((item) =>
        this.db.stackItem.updateMany({
          where: { id: item.id, stackId },
          data: { timeSlot: item.timeSlot },
        }),
      ),
    );

    const updatedStack = await this.db.stack.findUnique({
      where: { id: stackId },
      include: {
        items: { orderBy: [{ timeSlot: 'asc' }, { createdAt: 'asc' }] },
      },
    });

    return {
      success: true,
      data: this.formatStackResponse(
        updatedStack! as Parameters<typeof this.formatStackResponse>[0],
      ),
    };
  }

  // ========== Logging ==========

  /**
   * Log or toggle supplement intake for a specific date
   */
  async logIntake(
    userId: string,
    stackId: string,
    itemId: string,
    date: string,
    taken: boolean,
  ): Promise<
    | SuccessResponse<{ itemId: string; date: string; taken: boolean }>
    | ErrorResponse
  > {
    // Verify the item belongs to the user's stack
    const item = await this.db.stackItem.findFirst({
      where: { id: itemId, stackId, stack: { userId } },
    });

    if (!item) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item not found' },
      };
    }

    const dateObj = new Date(date);

    if (taken) {
      // Upsert to create or update the log entry
      await this.db.stackLog.upsert({
        where: { stackItemId_date: { stackItemId: itemId, date: dateObj } },
        create: { stackItemId: itemId, date: dateObj, taken: true },
        update: { taken: true },
      });

      // Auto-complete linked STACK habits
      this.habitsService
        .autoCompleteLinkedHabits(userId, 'STACK', date)
        .catch(() => {});
    } else {
      // Delete the log entry if exists (untaken = no record)
      await this.db.stackLog.deleteMany({
        where: { stackItemId: itemId, date: dateObj },
      });
    }

    return { success: true, data: { itemId, date, taken } };
  }

  /**
   * Get logs for a specific date
   */
  async getLogsForDate(
    userId: string,
    stackId: string,
    date: string,
  ): Promise<SuccessResponse<DailyLogResponse> | ErrorResponse> {
    const stack = await this.db.stack.findFirst({
      where: { id: stackId, userId },
    });

    if (!stack) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stack not found' },
      };
    }

    const dateObj = new Date(date);

    const logs = await this.db.stackLog.findMany({
      where: {
        stackItem: { stackId },
        date: dateObj,
      },
      select: { stackItemId: true, taken: true },
    });

    const logsMap: { [itemId: string]: boolean } = {};
    logs.forEach((log) => {
      logsMap[log.stackItemId] = log.taken;
    });

    return {
      success: true,
      data: { date, logs: logsMap },
    };
  }

  /**
   * Reset all logs for a specific date
   */
  async resetLogsForDate(
    userId: string,
    stackId: string,
    date: string,
  ): Promise<SuccessResponse<{ reset: true }> | ErrorResponse> {
    const stack = await this.db.stack.findFirst({
      where: { id: stackId, userId },
      include: { items: { select: { id: true } } },
    });

    if (!stack) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stack not found' },
      };
    }

    const dateObj = new Date(date);
    const itemIds = stack.items.map((item) => item.id);

    await this.db.stackLog.deleteMany({
      where: {
        stackItemId: { in: itemIds },
        date: dateObj,
      },
    });

    return { success: true, data: { reset: true } };
  }

  // ========== Helpers ==========

  private formatStackResponse(stack: {
    id: string;
    name: string;
    isActive: boolean;
    tips: unknown;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      name: string;
      dosage: string;
      timeSlot: string | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }): StackResponse {
    return {
      id: stack.id,
      name: stack.name,
      isActive: stack.isActive,
      items: stack.items.map((item) => this.formatItemResponse(item)),
      tips: (stack.tips as StackResponse['tips']) ?? null,
      createdAt: stack.createdAt.toISOString(),
      updatedAt: stack.updatedAt.toISOString(),
    };
  }

  private formatItemResponse(item: {
    id: string;
    name: string;
    dosage: string;
    timeSlot: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): StackItemResponse {
    return {
      id: item.id,
      name: item.name,
      dosage: item.dosage,
      timeSlot: item.timeSlot as StackItemResponse['timeSlot'],
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private encryptStackItem(
    name: string,
    dosage: string,
    notes?: string | null,
  ) {
    const payload = JSON.stringify({ name, dosage, notes });
    const enc = this.encryption.encrypt(payload);
    return {
      eStackItem: enc.encryptedContent,
      stackItemIv: enc.contentIv,
      stackItemAuthTag: enc.contentAuthTag,
      stackItemWrappedKey: enc.wrappedKey,
    };
  }
}
