import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import type {
  CreateBodyMeasurement,
  BodyMeasurementQuery,
  BodyMeasurementResponse,
  BodyMeasurementsListData,
  MeasurementUnit,
  SuccessResponse,
} from '@varaperformance/core';

interface MeasurementData {
  neck?: number;
  shoulders?: number;
  chest?: number;
  leftBicep?: number;
  rightBicep?: number;
  waist?: number;
  hips?: number;
  leftThigh?: number;
  rightThigh?: number;
  leftCalf?: number;
  rightCalf?: number;
}

@Injectable()
export class MeasurementsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  async create(
    userId: string,
    data: CreateBodyMeasurement,
  ): Promise<SuccessResponse<BodyMeasurementResponse>> {
    const { unit, note, ...measurements } = data;

    const measurementData: MeasurementData = {};
    for (const [key, value] of Object.entries(measurements)) {
      if (value !== undefined) {
        measurementData[key as keyof MeasurementData] = value;
      }
    }

    const encrypted = this.encryption.encrypt(JSON.stringify(measurementData));

    let noteEncryption: ReturnType<typeof this.encryption.encrypt> | null =
      null;
    if (note) {
      noteEncryption = this.encryption.encrypt(note);
    }

    const record = await this.db.bodyMeasurement.create({
      data: {
        userId,
        unit,
        encryptedData: encrypted.encryptedContent,
        dataIv: encrypted.contentIv,
        dataAuthTag: encrypted.contentAuthTag,
        wrappedKey: encrypted.wrappedKey,
        ...(noteEncryption && {
          encryptedNote: noteEncryption.encryptedContent,
          noteIv: noteEncryption.contentIv,
          noteAuthTag: noteEncryption.contentAuthTag,
          noteWrappedKey: noteEncryption.wrappedKey,
        }),
      },
    });

    return {
      success: true as const,
      data: this.decryptRecord(record),
    };
  }

  async findAll(
    userId: string,
    query: BodyMeasurementQuery,
  ): Promise<SuccessResponse<BodyMeasurementsListData>> {
    const where: Record<string, unknown> = { userId };

    if (query.startDate || query.endDate) {
      const loggedAt: Record<string, Date> = {};
      if (query.startDate) loggedAt.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        loggedAt.lte = end;
      }
      where.loggedAt = loggedAt;
    }

    const records = await this.db.bodyMeasurement.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      take: query.limit,
    });

    const items = records.map((r) => this.decryptRecord(r));

    // Calculate change stats from first to last if we have at least 2 items
    let stats: BodyMeasurementsListData['stats'];
    if (items.length >= 2) {
      const latest = items[0];
      const earliest = items[items.length - 1];
      stats = {
        waistChange:
          latest.waist !== null && earliest.waist !== null
            ? Math.round((latest.waist - earliest.waist) * 10) / 10
            : null,
        chestChange:
          latest.chest !== null && earliest.chest !== null
            ? Math.round((latest.chest - earliest.chest) * 10) / 10
            : null,
        hipsChange:
          latest.hips !== null && earliest.hips !== null
            ? Math.round((latest.hips - earliest.hips) * 10) / 10
            : null,
      };
    }

    return { success: true as const, data: { items, stats } };
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<SuccessResponse<BodyMeasurementResponse>> {
    const record = await this.db.bodyMeasurement.findFirst({
      where: { id, userId },
    });

    if (!record) {
      throw new NotFoundException('Measurement not found');
    }

    return { success: true as const, data: this.decryptRecord(record) };
  }

  async remove(userId: string, id: string): Promise<SuccessResponse<null>> {
    const record = await this.db.bodyMeasurement.findFirst({
      where: { id, userId },
    });

    if (!record) {
      throw new NotFoundException('Measurement not found');
    }

    await this.db.bodyMeasurement.delete({ where: { id } });
    return { success: true as const, data: null };
  }

  private decryptRecord(record: {
    id: string;
    unit: string;
    encryptedData: Uint8Array;
    dataIv: Uint8Array;
    dataAuthTag: Uint8Array;
    wrappedKey: Uint8Array;
    encryptedNote: Uint8Array | null;
    noteIv: Uint8Array | null;
    noteAuthTag: Uint8Array | null;
    noteWrappedKey: Uint8Array | null;
    loggedAt: Date;
    createdAt: Date;
  }): BodyMeasurementResponse {
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(record.encryptedData),
      contentIv: Buffer.from(record.dataIv),
      contentAuthTag: Buffer.from(record.dataAuthTag),
      wrappedKey: Buffer.from(record.wrappedKey),
    });

    const measurements: MeasurementData = JSON.parse(decrypted.toString());

    let note: string | null = null;
    if (
      record.encryptedNote &&
      record.noteIv &&
      record.noteAuthTag &&
      record.noteWrappedKey
    ) {
      note = this.encryption
        .decrypt({
          encryptedContent: Buffer.from(record.encryptedNote),
          contentIv: Buffer.from(record.noteIv),
          contentAuthTag: Buffer.from(record.noteAuthTag),
          wrappedKey: Buffer.from(record.noteWrappedKey),
        })
        .toString();
    }

    return {
      id: record.id,
      unit: record.unit as MeasurementUnit,
      neck: measurements.neck ?? null,
      shoulders: measurements.shoulders ?? null,
      chest: measurements.chest ?? null,
      leftBicep: measurements.leftBicep ?? null,
      rightBicep: measurements.rightBicep ?? null,
      waist: measurements.waist ?? null,
      hips: measurements.hips ?? null,
      leftThigh: measurements.leftThigh ?? null,
      rightThigh: measurements.rightThigh ?? null,
      leftCalf: measurements.leftCalf ?? null,
      rightCalf: measurements.rightCalf ?? null,
      note,
      loggedAt: record.loggedAt.toISOString(),
      createdAt: record.createdAt.toISOString(),
    };
  }
}
