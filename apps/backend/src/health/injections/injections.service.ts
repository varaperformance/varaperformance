import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { HabitsService } from '../habits/habits.service';
import {
  injectionLogSelect,
  injectionProtocolSelect,
} from './selectors/injection.selector';
import type {
  CreateInjectionLog,
  CreateInjectionProtocol,
  ErrorResponse,
  InjectionLogResponse,
  InjectionLogsListData,
  InjectionLogsQuery,
  InjectionProtocolResponse,
  InjectionRoute,
  InjectionSite,
  SuccessResponse,
  UpdateInjectionProtocol,
} from '@varaperformance/core';

interface InjectionProtocolData {
  name: string;
  defaultDose: string | null;
  unit: string | null;
  route: InjectionRoute | null;
  notes: string | null;
}

interface InjectionLogData {
  name: string;
  dose: string | null;
  unit: string | null;
  route: InjectionRoute | null;
  site: InjectionSite | null;
  notes: string | null;
}

@Injectable()
export class InjectionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly habitsService: HabitsService,
  ) {}

  async createProtocol(
    userId: string,
    data: CreateInjectionProtocol,
  ): Promise<SuccessResponse<InjectionProtocolResponse>> {
    const protocolData: InjectionProtocolData = {
      name: data.name,
      defaultDose: data.defaultDose ?? null,
      unit: data.unit ?? null,
      route: data.route ?? null,
      notes: data.notes ?? null,
    };

    const encrypted = this.encryption.encrypt(JSON.stringify(protocolData));

    const protocol = await this.db.injectionProtocol.create({
      data: {
        userId,
        encryptedData: encrypted.encryptedContent,
        dataIv: encrypted.contentIv,
        dataAuthTag: encrypted.contentAuthTag,
        wrappedKey: encrypted.wrappedKey,
      },
      select: injectionProtocolSelect,
    });

    return {
      success: true,
      data: this.formatProtocolResponse(protocol, protocolData),
    };
  }

  async findProtocols(
    userId: string,
  ): Promise<SuccessResponse<InjectionProtocolResponse[]>> {
    const protocols = await this.db.injectionProtocol.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: injectionProtocolSelect,
    });

    return {
      success: true,
      data: protocols.map((protocol) => {
        const decrypted = this.decryptProtocol(protocol);
        return this.formatProtocolResponse(protocol, decrypted);
      }),
    };
  }

  async updateProtocol(
    userId: string,
    protocolId: string,
    data: UpdateInjectionProtocol,
  ): Promise<SuccessResponse<InjectionProtocolResponse> | ErrorResponse> {
    const existing = await this.db.injectionProtocol.findFirst({
      where: { id: protocolId, userId },
      select: injectionProtocolSelect,
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Injection protocol not found' },
      };
    }

    const previous = this.decryptProtocol(existing);
    const next: InjectionProtocolData = {
      name: data.name ?? previous.name,
      defaultDose:
        data.defaultDose !== undefined
          ? data.defaultDose
          : previous.defaultDose,
      unit: data.unit !== undefined ? data.unit : previous.unit,
      route: data.route !== undefined ? data.route : previous.route,
      notes: data.notes !== undefined ? data.notes : previous.notes,
    };

    const encrypted = this.encryption.encrypt(JSON.stringify(next));

    const updated = await this.db.injectionProtocol.update({
      where: { id: protocolId },
      data: {
        encryptedData: encrypted.encryptedContent,
        dataIv: encrypted.contentIv,
        dataAuthTag: encrypted.contentAuthTag,
        wrappedKey: encrypted.wrappedKey,
      },
      select: injectionProtocolSelect,
    });

    return { success: true, data: this.formatProtocolResponse(updated, next) };
  }

  async removeProtocol(
    userId: string,
    protocolId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const existing = await this.db.injectionProtocol.findFirst({
      where: { id: protocolId, userId },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Injection protocol not found' },
      };
    }

    await this.db.injectionProtocol.delete({ where: { id: protocolId } });
    return { success: true, data: { deleted: true } };
  }

  async createLog(
    userId: string,
    data: CreateInjectionLog,
  ): Promise<SuccessResponse<InjectionLogResponse> | ErrorResponse> {
    let protocolData: InjectionProtocolData | null = null;

    if (data.protocolId) {
      const protocol = await this.db.injectionProtocol.findFirst({
        where: { id: data.protocolId, userId },
        select: injectionProtocolSelect,
      });

      if (!protocol) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Injection protocol not found' },
        };
      }

      protocolData = this.decryptProtocol(protocol);
    }

    const logData: InjectionLogData = {
      name: data.name ?? protocolData?.name ?? 'Injection',
      dose: data.dose ?? protocolData?.defaultDose ?? null,
      unit: data.unit ?? protocolData?.unit ?? null,
      route: data.route ?? protocolData?.route ?? null,
      site: data.site ?? null,
      notes: data.notes ?? null,
    };

    const encrypted = this.encryption.encrypt(JSON.stringify(logData));

    const log = await this.db.injectionLog.create({
      data: {
        userId,
        protocolId: data.protocolId ?? null,
        encryptedData: encrypted.encryptedContent,
        dataIv: encrypted.contentIv,
        dataAuthTag: encrypted.contentAuthTag,
        wrappedKey: encrypted.wrappedKey,
        ...(data.loggedAt && { loggedAt: new Date(data.loggedAt) }),
      },
      select: injectionLogSelect,
    });

    // Auto-complete linked INJECTION habits
    this.habitsService
      .autoCompleteLinkedHabits(userId, 'INJECTION')
      .catch(() => {});

    return { success: true, data: this.formatLogResponse(log, logData) };
  }

  async findLogs(
    userId: string,
    query: InjectionLogsQuery,
  ): Promise<SuccessResponse<InjectionLogsListData>> {
    const where: {
      userId: string;
      protocolId?: string;
      loggedAt?: { gte?: Date; lte?: Date };
    } = {
      userId,
    };

    if (query.protocolId) {
      where.protocolId = query.protocolId;
    }

    if (query.startDate || query.endDate) {
      where.loggedAt = {};
      if (query.startDate) {
        where.loggedAt.gte = new Date(`${query.startDate}T00:00:00.000Z`);
      }
      if (query.endDate) {
        where.loggedAt.lte = new Date(`${query.endDate}T23:59:59.999Z`);
      }
    }

    const [logs, total] = await Promise.all([
      this.db.injectionLog.findMany({
        where,
        orderBy: { loggedAt: 'desc' },
        take: query.limit,
        select: injectionLogSelect,
      }),
      this.db.injectionLog.count({ where }),
    ]);

    const items = logs.map((log) => {
      const decrypted = this.decryptLog(log);
      return this.formatLogResponse(log, decrypted);
    });

    return {
      success: true,
      data: {
        items,
        total,
        limit: query.limit,
      },
    };
  }

  async removeLog(
    userId: string,
    logId: string,
  ): Promise<SuccessResponse<{ deleted: true }> | ErrorResponse> {
    const existing = await this.db.injectionLog.findFirst({
      where: { id: logId, userId },
      select: { id: true },
    });

    if (!existing) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Injection log not found' },
      };
    }

    await this.db.injectionLog.delete({ where: { id: logId } });
    return { success: true, data: { deleted: true } };
  }

  private decryptProtocol(protocol: {
    encryptedData: Uint8Array;
    dataIv: Uint8Array;
    dataAuthTag: Uint8Array;
    wrappedKey: Uint8Array;
  }): InjectionProtocolData {
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(protocol.encryptedData),
      contentIv: Buffer.from(protocol.dataIv),
      contentAuthTag: Buffer.from(protocol.dataAuthTag),
      wrappedKey: Buffer.from(protocol.wrappedKey),
    });
    return JSON.parse(decrypted.toString()) as InjectionProtocolData;
  }

  private decryptLog(log: {
    encryptedData: Uint8Array;
    dataIv: Uint8Array;
    dataAuthTag: Uint8Array;
    wrappedKey: Uint8Array;
  }): InjectionLogData {
    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(log.encryptedData),
      contentIv: Buffer.from(log.dataIv),
      contentAuthTag: Buffer.from(log.dataAuthTag),
      wrappedKey: Buffer.from(log.wrappedKey),
    });
    return JSON.parse(decrypted.toString()) as InjectionLogData;
  }

  private formatProtocolResponse(
    protocol: { id: string; createdAt: Date; updatedAt: Date },
    data: InjectionProtocolData,
  ): InjectionProtocolResponse {
    return {
      id: protocol.id,
      name: data.name,
      defaultDose: data.defaultDose,
      unit: data.unit,
      route: data.route,
      notes: data.notes,
      createdAt: protocol.createdAt.toISOString(),
      updatedAt: protocol.updatedAt.toISOString(),
    };
  }

  private formatLogResponse(
    log: {
      id: string;
      protocolId: string | null;
      loggedAt: Date;
      createdAt: Date;
    },
    data: InjectionLogData,
  ): InjectionLogResponse {
    return {
      id: log.id,
      protocolId: log.protocolId,
      name: data.name,
      dose: data.dose,
      unit: data.unit,
      route: data.route,
      site: data.site,
      notes: data.notes,
      loggedAt: log.loggedAt.toISOString(),
      createdAt: log.createdAt.toISOString(),
    };
  }
}
