import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { CreateWeightLog, UnitPreference } from '@varaperformance/core';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import { WeightService } from '../health/weight/weight.service';
import type {
  HealthProvider,
  HealthProviderConnection,
  HealthProviderSyncResult,
} from './health/health-provider.interface';
import { HealthTokenService } from './health/health-token.service';
import { HealthSyncService } from './health/health-sync.service';
import withingsConfig from './config/withings.config';

const WBS_API = 'https://wbsapi.withings.net';
const OAUTH = 'https://account.withings.com';

const MEASURE_WEIGHT_KG = 1;
const MEASURE_FAT_RATIO_PCT = 6;
const MEASURE_MUSCLE_MASS_KG = 76;

type WithingsEnvelope<T> = { status: number; body?: T; error?: string };

type TokenBody = {
  userid?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

type MeasureItem = { type: number; value: number; unit: number };
type MeasureGrp = { grpid: number; date: number; measures: MeasureItem[] };

@Injectable()
export class WithingsIntegrationService
  implements HealthProvider, OnModuleInit
{
  readonly providerKey = 'withings';
  private readonly logger = new Logger(WithingsIntegrationService.name);
  private static readonly DEDUPE_CAP = 8000;

  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
    private readonly weight: WeightService,
    private readonly tokens: HealthTokenService,
    private readonly syncService: HealthSyncService,
    @Inject(withingsConfig.KEY)
    private readonly config: ConfigType<typeof withingsConfig>,
  ) {}

  onModuleInit() {
    this.syncService.registerProvider(this);
  }

  // ---------------------------------------------------------------------------
  // HealthProvider — getStatus
  // ---------------------------------------------------------------------------

  async getStatus(userId: string) {
    const store = await this.tokens.readStore(userId);
    const c = store.integrations?.withings;
    if (!c) {
      return { connected: false };
    }
    return {
      connected: true,
      withingsUserId: c.withingsUserId as string | undefined,
      connectedAt: c.connectedAt,
      lastSyncedAt: c.lastSyncedAt ?? null,
      importedMeasureGroups: Array.isArray(c.seenMeasureGrpIds)
        ? (c.seenMeasureGrpIds as string[]).length
        : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // HealthProvider — createConnectUrl
  // ---------------------------------------------------------------------------

  async createConnectUrl(userId: string) {
    this.assertConfigured();
    const nonce = randomUUID();
    await this.tokens.setOAuthNonce(userId, this.providerKey, nonce);
    const state = this.tokens.buildOAuthState(userId, nonce);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      scope: this.scopesForAuthorizeUrl(),
    });
    return {
      authorizeUrl: `${OAUTH}/oauth2_user/authorize2?${params.toString()}`,
    };
  }

  private scopesForAuthorizeUrl(): string {
    return this.config.scopes
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join(',');
  }

  // ---------------------------------------------------------------------------
  // HealthProvider — handleCallback
  // ---------------------------------------------------------------------------

  async handleCallback(userId: string, code: string, nonce: string) {
    this.assertConfigured();

    await this.tokens.validateAndConsumeNonce(
      userId,
      this.providerKey,
      nonce,
      this.config.stateTtlMs,
    );

    const form = new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
    });
    const response = await fetch(`${WBS_API}/v2/oauth2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const json = (await response.json()) as WithingsEnvelope<TokenBody>;
    if (json.status !== 0 || !json.body) {
      this.logger.warn(
        `Withings token exchange failed (${json.status}): ${json.error ?? 'unknown'}`,
      );
      throw new BadRequestException(
        `withings_token_exchange_failed_${json.status}`,
      );
    }
    const body = json.body;
    if (
      !body.access_token ||
      !body.refresh_token ||
      !body.expires_in ||
      body.userid === undefined
    ) {
      throw new BadRequestException('withings_token_payload_invalid');
    }
    const nowSec = Math.floor(Date.now() / 1000);
    await this.tokens.setConnection(userId, this.providerKey, {
      withingsUserId: String(body.userid),
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: nowSec + body.expires_in,
      scope: body.scope ?? null,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: null,
      seenMeasureGrpIds: [],
    });

    try {
      await this.syncMeasurements(userId);
    } catch (error) {
      this.logger.warn(
        { err: error, userId },
        'Initial Withings sync failed after connect',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // HealthProvider — syncData (delegates to syncMeasurements)
  // ---------------------------------------------------------------------------

  async syncData(userId: string): Promise<HealthProviderSyncResult> {
    const result = await this.syncMeasurements(userId);
    return {
      importedCount: result.data.importedCount,
      lastSyncedAt: result.data.lastSyncedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // HealthProvider — isConnected
  // ---------------------------------------------------------------------------

  async isConnected(userId: string): Promise<boolean> {
    const connection = await this.tokens.getConnection(
      userId,
      this.providerKey,
    );
    return connection !== null;
  }

  // ---------------------------------------------------------------------------
  // Measurement sync
  // ---------------------------------------------------------------------------

  async syncMeasurements(userId: string) {
    const store = await this.tokens.readStore(userId);
    const c = store.integrations?.withings;
    if (!c) {
      throw new NotFoundException('Withings integration is not connected');
    }

    const unitPref = await this.getUserUnitPreference(userId);
    const isImperial = unitPref === 'imperial';

    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = nowSec - this.config.historyDays * 24 * 60 * 60;
    const seenIds = Array.isArray(c.seenMeasureGrpIds)
      ? (c.seenMeasureGrpIds as string[])
      : [];
    const seen = new Set(seenIds);
    let imported = 0;
    let offset = 0;
    for (;;) {
      const page = await this.getMeasurePage(
        userId,
        c,
        startSec,
        nowSec,
        offset,
      );
      for (const grp of page.measuregrps) {
        const grpid = String(grp.grpid);
        if (seen.has(grpid)) continue;
        const payload = this.mapGroup(grp, isImperial);
        if (!payload) continue;
        const res = await this.weight.create(userId, payload);
        if (res.success) {
          seen.add(grpid);
          imported += 1;
        }
      }

      this.persistSeenIds(c, seen);
      await this.tokens.writeStore(userId, store);

      if (!page.more || page.measuregrps.length === 0) {
        break;
      }
      offset = page.nextOffset;
    }
    c.lastSyncedAt = new Date().toISOString();
    await this.tokens.writeStore(userId, store);
    return {
      success: true as const,
      data: { importedCount: imported, lastSyncedAt: c.lastSyncedAt },
    };
  }

  private persistSeenIds(c: HealthProviderConnection, seen: Set<string>) {
    const all = Array.from(seen);
    (c as Record<string, unknown>).seenMeasureGrpIds =
      all.length > WithingsIntegrationService.DEDUPE_CAP
        ? all.slice(all.length - WithingsIntegrationService.DEDUPE_CAP)
        : all;
  }

  private async getMeasurePage(
    userId: string,
    connection: HealthProviderConnection,
    startSec: number,
    endSec: number,
    offset: number,
  ): Promise<{
    measuregrps: MeasureGrp[];
    more: boolean;
    nextOffset: number;
  }> {
    const params = new URLSearchParams({
      action: 'getmeas',
      startdate: String(startSec),
      enddate: String(endSec),
      offset: String(offset),
    });

    type GetMeasBody = {
      measuregrps?: MeasureGrp[];
      more?: 0 | 1;
      offset?: number;
    };

    const doFetch = (token: string) =>
      fetch(`${WBS_API}/v2/measure`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

    let accessToken = await this.tokens.ensureValidAccessToken(
      userId,
      this.providerKey,
      connection,
      (conn) => this.refreshTokens(conn),
      120,
    );

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await doFetch(accessToken);
      const text = await res.text();
      let json: WithingsEnvelope<GetMeasBody>;
      try {
        json = JSON.parse(text) as WithingsEnvelope<GetMeasBody>;
      } catch {
        this.logger.warn(`Withings getmeas non-JSON: ${text.slice(0, 200)}`);
        throw new ServiceUnavailableException('withings_getmeas_invalid');
      }
      if (json.status === 0) {
        const grps = json.body?.measuregrps ?? [];
        const more = (json.body?.more ?? 0) === 1;
        const nextOffset = json.body?.offset ?? offset + grps.length;
        return { measuregrps: grps, more, nextOffset };
      }
      if ((json.status === 401 || json.status === 293) && attempt === 0) {
        await this.refreshTokens(connection);
        accessToken = await this.tokens.ensureValidAccessToken(
          userId,
          this.providerKey,
          connection,
          (conn) => this.refreshTokens(conn),
          120,
        );
        continue;
      }
      this.logger.warn(`Withings getmeas error: ${json.status} ${json.error}`);
      throw new ServiceUnavailableException(`withings_getmeas_${json.status}`);
    }
    throw new ServiceUnavailableException('withings_getmeas_failed');
  }

  // ---------------------------------------------------------------------------
  // HealthProvider — disconnect
  // ---------------------------------------------------------------------------

  async disconnect(userId: string) {
    const connection = await this.tokens.getConnection(
      userId,
      this.providerKey,
    );
    if (!connection) {
      return;
    }

    if (
      this.config.clientId &&
      this.config.clientSecret &&
      connection.accessToken
    ) {
      try {
        await fetch(`${WBS_API}/v2/oauth2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action: 'revoke',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            token: connection.accessToken,
          }).toString(),
        });
      } catch {
        // Ignore upstream revocation errors; local disconnect still succeeds.
      }
    }

    await this.tokens.removeConnection(userId, this.providerKey);
  }

  // ---------------------------------------------------------------------------
  // Controller helpers (not part of HealthProvider interface)
  // ---------------------------------------------------------------------------

  parseOAuthState(state: string) {
    return this.tokens.parseOAuthState(state);
  }

  getCallbackRedirectUrl(status: 'connected' | 'error', reason?: string) {
    const url = new URL(this.config.webRedirectUrl);
    url.searchParams.set('withings', status);
    if (reason) {
      url.searchParams.set('reason', String(reason).slice(0, 200));
    }
    return url.toString();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private static readonly KG_TO_LB = 2.20462;

  private mapGroup(
    grp: MeasureGrp,
    isImperial: boolean,
  ): CreateWeightLog | null {
    let weightKg: number | null = null;
    let bodyFat: number | undefined;
    let muscleMassKg: number | undefined;

    for (const m of grp.measures ?? []) {
      const v = m.value * Math.pow(10, m.unit);
      if (m.type === MEASURE_WEIGHT_KG) {
        weightKg = v;
      } else if (m.type === MEASURE_FAT_RATIO_PCT) {
        if (v >= 1 && v <= 70) {
          bodyFat = Math.round(v * 10) / 10;
        }
      } else if (m.type === MEASURE_MUSCLE_MASS_KG) {
        if (v > 0 && v <= 500) {
          muscleMassKg = Math.round(v * 100) / 100;
        }
      }
    }

    if (weightKg === null || weightKg <= 0 || weightKg > 500) {
      return null;
    }
    const measuredAt = new Date(grp.date * 1000);
    if (Number.isNaN(measuredAt.getTime())) {
      return null;
    }

    const toUserUnit = (kg: number) =>
      isImperial
        ? Math.round(kg * WithingsIntegrationService.KG_TO_LB * 100) / 100
        : Math.round(kg * 100) / 100;

    const out: CreateWeightLog = {
      value: toUserUnit(weightKg),
      unit: isImperial ? 'LB' : 'KG',
      source: 'WITHINGS',
      loggedAt: measuredAt.toISOString(),
    };
    if (bodyFat !== undefined) {
      out.bodyFat = bodyFat;
    }
    if (muscleMassKg !== undefined) {
      out.muscleMass = toUserUnit(muscleMassKg);
    }
    return out;
  }

  private async getUserUnitPreference(userId: string): Promise<UnitPreference> {
    const profile = await this.db.profile.findUnique({
      where: { userId },
      select: {
        eProfile: true,
        profileIv: true,
        profileAuthTag: true,
        profileWrappedKey: true,
      },
    });
    if (
      !profile?.eProfile ||
      !profile.profileIv ||
      !profile.profileAuthTag ||
      !profile.profileWrappedKey
    ) {
      return 'metric';
    }
    try {
      const decrypted = this.encryption.decrypt({
        encryptedContent: Buffer.from(profile.eProfile),
        contentIv: Buffer.from(profile.profileIv),
        contentAuthTag: Buffer.from(profile.profileAuthTag),
        wrappedKey: Buffer.from(profile.profileWrappedKey),
      });
      const pii = JSON.parse(decrypted.toString()) as { unit?: string };
      return pii.unit === 'imperial' ? 'imperial' : 'metric';
    } catch {
      return 'metric';
    }
  }

  private async refreshTokens(connection: HealthProviderConnection) {
    this.assertConfigured();
    const form = new URLSearchParams({
      action: 'requesttoken',
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: connection.refreshToken,
    });
    const res = await fetch(`${WBS_API}/v2/oauth2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const json = (await res.json()) as WithingsEnvelope<TokenBody>;
    if (json.status !== 0 || !json.body) {
      this.logger.warn(
        `Withings token refresh failed (${json.status}): ${json.error}`,
      );
      throw new BadRequestException('withings_token_refresh_failed');
    }
    const body = json.body;
    if (!body.access_token || !body.refresh_token || !body.expires_in) {
      throw new BadRequestException('withings_token_refresh_payload_invalid');
    }
    const nowSec = Math.floor(Date.now() / 1000);
    connection.accessToken = body.access_token;
    connection.refreshToken = body.refresh_token;
    connection.expiresAt = nowSec + body.expires_in;
  }

  private assertConfigured() {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new ServiceUnavailableException(
        'Withings integration is not configured',
      );
    }
  }
}
