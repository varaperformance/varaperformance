import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import type {
  CreateWeightLog,
  WeightLogQuery,
  WeightLogResponse,
  WeightLogsListData,
  WeightGoalResponse,
  UpdateWeightGoal,
  WeightUnit,
  WeightGoalType,
  SuccessResponse,
  ErrorResponse,
} from '@varaperformance/core';

interface WeightData {
  value: number;
  unit: WeightUnit;
}

interface TargetWeightData {
  value: number;
  unit: WeightUnit;
}

@Injectable()
export class WeightService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Create a new encrypted weight log
   */
  async create(
    userId: string,
    data: CreateWeightLog,
  ): Promise<SuccessResponse<WeightLogResponse>> {
    const weightData: WeightData = { value: data.value, unit: data.unit };
    const encrypted = this.encryption.encrypt(JSON.stringify(weightData));

    // Encrypt note if provided
    let noteEncryption: ReturnType<typeof this.encryption.encrypt> | null =
      null;
    if (data.note) {
      noteEncryption = this.encryption.encrypt(data.note);
    }

    // Encrypt body fat if provided
    let bodyFatEncryption: ReturnType<typeof this.encryption.encrypt> | null =
      null;
    if (data.bodyFat !== undefined) {
      bodyFatEncryption = this.encryption.encrypt(String(data.bodyFat));
    }

    // Encrypt muscle mass if provided
    let muscleMassEncryption: ReturnType<
      typeof this.encryption.encrypt
    > | null = null;
    if (data.muscleMass !== undefined) {
      muscleMassEncryption = this.encryption.encrypt(String(data.muscleMass));
    }

    let loggedAt: Date | undefined;
    if (data.loggedAt) {
      const d = new Date(data.loggedAt);
      if (!Number.isNaN(d.getTime())) {
        loggedAt = d;
      }
    }

    const log = await this.db.weightLog.create({
      data: {
        userId,
        encryptedData: encrypted.encryptedContent,
        dataIv: encrypted.contentIv,
        dataAuthTag: encrypted.contentAuthTag,
        wrappedKey: encrypted.wrappedKey,
        source: data.source ?? 'MANUAL',
        ...(loggedAt && { loggedAt }),
        ...(noteEncryption && {
          encryptedNote: noteEncryption.encryptedContent,
          noteIv: noteEncryption.contentIv,
          noteAuthTag: noteEncryption.contentAuthTag,
          noteWrappedKey: noteEncryption.wrappedKey,
        }),
        ...(bodyFatEncryption && {
          encryptedBodyFat: bodyFatEncryption.encryptedContent,
          bodyFatIv: bodyFatEncryption.contentIv,
          bodyFatAuthTag: bodyFatEncryption.contentAuthTag,
          bodyFatWrappedKey: bodyFatEncryption.wrappedKey,
        }),
        ...(muscleMassEncryption && {
          encryptedMuscleMass: muscleMassEncryption.encryptedContent,
          muscleMassIv: muscleMassEncryption.contentIv,
          muscleMassAuthTag: muscleMassEncryption.contentAuthTag,
          muscleMassWrappedKey: muscleMassEncryption.wrappedKey,
        }),
      },
    });

    return {
      success: true,
      data: this.formatResponse(
        log,
        weightData,
        data.note ?? null,
        data.bodyFat ?? null,
        data.muscleMass ?? null,
      ),
    };
  }

  /**
   * Get weight logs for a user (decrypted)
   */
  async findAll(
    userId: string,
    query: WeightLogQuery,
  ): Promise<SuccessResponse<WeightLogsListData>> {
    const { startDate, endDate, limit } = query;

    const where: {
      userId: string;
      loggedAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (startDate || endDate) {
      where.loggedAt = {};
      if (startDate) where.loggedAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.loggedAt.lte = end;
      }
    }

    const logs = await this.db.weightLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      take: limit,
    });

    // Get goal
    const goalRecord = await this.db.weightGoal.findUnique({
      where: { userId },
    });
    const goal = goalRecord ? this.formatGoalResponse(goalRecord) : null;

    const items = logs.map((log) => {
      const decrypted = this.decryptWeightData(log);
      const note = log.encryptedNote ? this.decryptNote(log) : null;
      const bodyFat = log.encryptedBodyFat ? this.decryptBodyFat(log) : null;
      const muscleMass = log.encryptedMuscleMass
        ? this.decryptMuscleMass(log)
        : null;
      return this.formatResponse(log, decrypted, note, bodyFat, muscleMass);
    });

    // Calculate stats if we have items
    let stats: WeightLogsListData['stats'];
    if (items.length > 0) {
      const values = items.map((i) => i.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const change =
        items.length > 1 ? items[0].value - items[items.length - 1].value : 0;

      // Calculate body fat stats if available
      const bodyFatValues = items
        .filter((i) => i.bodyFat !== null)
        .map((i) => i.bodyFat as number);
      const avgBodyFat =
        bodyFatValues.length > 0
          ? bodyFatValues.reduce((a, b) => a + b, 0) / bodyFatValues.length
          : undefined;
      const bodyFatChange =
        bodyFatValues.length > 1
          ? bodyFatValues[0] - bodyFatValues[bodyFatValues.length - 1]
          : undefined;

      stats = {
        min,
        max,
        avg: Math.round(avg * 10) / 10,
        change: Math.round(change * 10) / 10,
        ...(avgBodyFat !== undefined && {
          avgBodyFat: Math.round(avgBodyFat * 10) / 10,
        }),
        ...(bodyFatChange !== undefined && {
          bodyFatChange: Math.round(bodyFatChange * 10) / 10,
        }),
      };
    }

    return { success: true, data: { items, goal, stats } };
  }

  /**
   * Get a single weight log by ID (decrypted)
   */
  async findOne(
    userId: string,
    logId: string,
  ): Promise<SuccessResponse<WeightLogResponse> | ErrorResponse> {
    const log = await this.db.weightLog.findFirst({
      where: { id: logId, userId },
    });

    if (!log) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weight log not found' },
      };
    }

    const decrypted = this.decryptWeightData(log);
    const note = log.encryptedNote ? this.decryptNote(log) : null;
    const bodyFat = log.encryptedBodyFat ? this.decryptBodyFat(log) : null;
    const muscleMass = log.encryptedMuscleMass
      ? this.decryptMuscleMass(log)
      : null;
    return {
      success: true,
      data: this.formatResponse(log, decrypted, note, bodyFat, muscleMass),
    };
  }

  /**
   * Delete a weight log
   */
  async remove(
    userId: string,
    logId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const log = await this.db.weightLog.findFirst({
      where: { id: logId, userId },
      select: { id: true },
    });

    if (!log) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Weight log not found' },
      };
    }

    await this.db.weightLog.delete({ where: { id: logId } });

    return { success: true, data: { deleted: true } };
  }

  /**
   * Get weight goal for user
   */
  async getGoal(userId: string): Promise<SuccessResponse<WeightGoalResponse>> {
    let goal = await this.db.weightGoal.findUnique({ where: { userId } });

    if (!goal) {
      // Create default goal (maintain at 150 lbs)
      const targetData: TargetWeightData = { value: 150, unit: 'LB' };
      const encrypted = this.encryption.encrypt(JSON.stringify(targetData));

      goal = await this.db.weightGoal.create({
        data: {
          userId,
          encryptedTargetWeight: encrypted.encryptedContent,
          targetWeightIv: encrypted.contentIv,
          targetWeightAuthTag: encrypted.contentAuthTag,
          targetWeightWrappedKey: encrypted.wrappedKey,
          goalType: 'MAINTAIN',
          weeklyRate: 0,
        },
      });
    }

    return { success: true, data: this.formatGoalResponse(goal) };
  }

  /**
   * Update weight goal
   */
  async updateGoal(
    userId: string,
    data: UpdateWeightGoal,
  ): Promise<SuccessResponse<WeightGoalResponse>> {
    // Encrypt target weight for create (with defaults) and update (if provided)
    const createTargetData: TargetWeightData = {
      value: data.targetWeight ?? 150,
      unit: data.targetUnit ?? 'LB',
    };
    const createEncrypted = this.encryption.encrypt(
      JSON.stringify(createTargetData),
    );

    // Build update encrypted data only if both weight and unit provided
    const updateEncrypted =
      data.targetWeight !== undefined && data.targetUnit !== undefined
        ? this.encryption.encrypt(
            JSON.stringify({
              value: data.targetWeight,
              unit: data.targetUnit,
            } as TargetWeightData),
          )
        : null;

    const goal = await this.db.weightGoal.upsert({
      where: { userId },
      create: {
        userId,
        encryptedTargetWeight: createEncrypted.encryptedContent,
        targetWeightIv: createEncrypted.contentIv,
        targetWeightAuthTag: createEncrypted.contentAuthTag,
        targetWeightWrappedKey: createEncrypted.wrappedKey,
        goalType: data.goalType ?? 'MAINTAIN',
        weeklyRate: data.weeklyRate ?? 0,
      },
      update: {
        ...(data.goalType !== undefined && { goalType: data.goalType }),
        ...(data.weeklyRate !== undefined && { weeklyRate: data.weeklyRate }),
        ...(updateEncrypted && {
          encryptedTargetWeight: updateEncrypted.encryptedContent,
          targetWeightIv: updateEncrypted.contentIv,
          targetWeightAuthTag: updateEncrypted.contentAuthTag,
          targetWeightWrappedKey: updateEncrypted.wrappedKey,
        }),
      },
    });

    return { success: true, data: this.formatGoalResponse(goal) };
  }

  /**
   * Decrypt weight data from database record
   */
  private decryptWeightData(log: {
    encryptedData: Uint8Array;
    dataIv: Uint8Array;
    dataAuthTag: Uint8Array;
    wrappedKey: Uint8Array;
  }): WeightData {
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(log.encryptedData),
      contentIv: Buffer.from(log.dataIv),
      contentAuthTag: Buffer.from(log.dataAuthTag),
      wrappedKey: Buffer.from(log.wrappedKey),
    });
    return JSON.parse(decrypted.toString()) as WeightData;
  }

  /**
   * Decrypt note from database record
   */
  private decryptNote(log: {
    encryptedNote: Uint8Array | null;
    noteIv: Uint8Array | null;
    noteAuthTag: Uint8Array | null;
    noteWrappedKey: Uint8Array | null;
  }): string | null {
    if (
      !log.encryptedNote ||
      !log.noteIv ||
      !log.noteAuthTag ||
      !log.noteWrappedKey
    ) {
      return null;
    }
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(log.encryptedNote),
      contentIv: Buffer.from(log.noteIv),
      contentAuthTag: Buffer.from(log.noteAuthTag),
      wrappedKey: Buffer.from(log.noteWrappedKey),
    });
    return decrypted.toString();
  }

  /**
   * Decrypt body fat from database record
   */
  private decryptBodyFat(log: {
    encryptedBodyFat: Uint8Array | null;
    bodyFatIv: Uint8Array | null;
    bodyFatAuthTag: Uint8Array | null;
    bodyFatWrappedKey: Uint8Array | null;
  }): number | null {
    if (
      !log.encryptedBodyFat ||
      !log.bodyFatIv ||
      !log.bodyFatAuthTag ||
      !log.bodyFatWrappedKey
    ) {
      return null;
    }
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(log.encryptedBodyFat),
      contentIv: Buffer.from(log.bodyFatIv),
      contentAuthTag: Buffer.from(log.bodyFatAuthTag),
      wrappedKey: Buffer.from(log.bodyFatWrappedKey),
    });
    return parseFloat(decrypted.toString());
  }

  /**
   * Decrypt muscle mass from database record
   */
  private decryptMuscleMass(log: {
    encryptedMuscleMass: Uint8Array | null;
    muscleMassIv: Uint8Array | null;
    muscleMassAuthTag: Uint8Array | null;
    muscleMassWrappedKey: Uint8Array | null;
  }): number | null {
    if (
      !log.encryptedMuscleMass ||
      !log.muscleMassIv ||
      !log.muscleMassAuthTag ||
      !log.muscleMassWrappedKey
    ) {
      return null;
    }
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(log.encryptedMuscleMass),
      contentIv: Buffer.from(log.muscleMassIv),
      contentAuthTag: Buffer.from(log.muscleMassAuthTag),
      wrappedKey: Buffer.from(log.muscleMassWrappedKey),
    });
    return parseFloat(decrypted.toString());
  }

  /**
   * Format weight log for response
   */
  private formatResponse(
    log: { id: string; source: string; loggedAt: Date; createdAt: Date },
    data: WeightData,
    note: string | null,
    bodyFat: number | null,
    muscleMass: number | null,
  ): WeightLogResponse {
    return {
      id: log.id,
      value: data.value,
      unit: data.unit,
      bodyFat,
      muscleMass,
      note,
      source: log.source,
      loggedAt: log.loggedAt.toISOString(),
      createdAt: log.createdAt.toISOString(),
    };
  }

  /**
   * Decrypt and format weight goal for response
   */
  private formatGoalResponse(goal: {
    id: string;
    encryptedTargetWeight: Uint8Array;
    targetWeightIv: Uint8Array;
    targetWeightAuthTag: Uint8Array;
    targetWeightWrappedKey: Uint8Array;
    goalType: string;
    weeklyRate: number;
  }): WeightGoalResponse {
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(goal.encryptedTargetWeight),
      contentIv: Buffer.from(goal.targetWeightIv),
      contentAuthTag: Buffer.from(goal.targetWeightAuthTag),
      wrappedKey: Buffer.from(goal.targetWeightWrappedKey),
    });
    const targetData = JSON.parse(decrypted.toString()) as TargetWeightData;

    return {
      id: goal.id,
      targetWeight: targetData.value,
      targetUnit: targetData.unit,
      goalType: goal.goalType as WeightGoalType,
      weeklyRate: goal.weeklyRate,
    };
  }
}
