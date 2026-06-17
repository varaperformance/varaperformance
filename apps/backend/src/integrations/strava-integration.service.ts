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
import { DatabaseService } from '@app/database';
import type {
  HealthProvider,
  HealthProviderConnection,
  HealthProviderSyncResult,
} from './health/health-provider.interface';
import { HealthTokenService } from './health/health-token.service';
import { HealthSyncService } from './health/health-sync.service';
import stravaConfig from './config/strava.config';

type StravaActivitySummary = {
  id: number;
  name: string;
  type: string;
  startDate: string;
  timezone: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  elevationGainMeters: number;
  averageSpeedMps: number;
  maxSpeedMps: number;
  kudosCount: number;
  calories: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  polyline: string | null;
};

@Injectable()
export class StravaIntegrationService implements HealthProvider, OnModuleInit {
  readonly providerKey = 'strava';
  private readonly logger = new Logger(StravaIntegrationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly tokens: HealthTokenService,
    private readonly syncService: HealthSyncService,
    @Inject(stravaConfig.KEY)
    private readonly config: ConfigType<typeof stravaConfig>,
  ) {}

  onModuleInit() {
    this.syncService.registerProvider(this);
  }

  // ---------------------------------------------------------------------------
  // HealthProvider — getStatus
  // ---------------------------------------------------------------------------

  async getStatus(userId: string) {
    const connection = await this.tokens.getConnection(
      userId,
      this.providerKey,
    );

    if (!connection) {
      return { connected: false };
    }

    const activityCount = await this.db.workoutSession.count({
      where: {
        userId,
        source: 'STRAVA',
        externalProvider: 'strava',
      },
    });

    return {
      connected: true,
      athleteId: connection.athleteId as number | undefined,
      athleteName: connection.athleteName as string | null | undefined,
      athleteUsername: connection.athleteUsername as string | null | undefined,
      connectedAt: connection.connectedAt,
      lastSyncedAt: connection.lastSyncedAt ?? null,
      activityCount,
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
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: this.config.scopes,
      state,
    });

    return {
      authorizeUrl: `https://www.strava.com/oauth/authorize?${params.toString()}`,
    };
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

    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      const exchangeError = await response.text();
      let upstreamCode = 'unknown';

      try {
        const parsed = JSON.parse(exchangeError) as {
          message?: string;
          errors?: Array<{ code?: string; resource?: string; field?: string }>;
        };

        if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
          upstreamCode = parsed.errors
            .map((err) => err.code)
            .filter((code): code is string => typeof code === 'string')
            .join('+');
        } else if (parsed.message) {
          upstreamCode = parsed.message;
        }
      } catch {
        // Keep unknown when upstream body is not JSON.
      }

      this.logger.warn(
        `Strava token exchange failed (${response.status}): ${exchangeError}`,
      );
      throw new BadRequestException(
        `strava_token_exchange_failed_${response.status}_${upstreamCode}`,
      );
    }

    const tokenData = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
      scope?: string;
      athlete?: {
        id?: number;
        username?: string | null;
        firstname?: string | null;
        lastname?: string | null;
      };
    };

    if (
      !tokenData.access_token ||
      !tokenData.refresh_token ||
      !tokenData.expires_at ||
      !tokenData.athlete?.id
    ) {
      throw new BadRequestException('strava_token_payload_invalid');
    }

    const athleteName = [
      tokenData.athlete.firstname,
      tokenData.athlete.lastname,
    ]
      .filter((value) => typeof value === 'string' && value.length > 0)
      .join(' ');

    await this.tokens.setConnection(userId, this.providerKey, {
      athleteId: tokenData.athlete.id,
      athleteUsername: tokenData.athlete.username ?? null,
      athleteName: athleteName || null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: tokenData.expires_at,
      scope: tokenData.scope ?? null,
      connectedAt: new Date().toISOString(),
      lastSyncedAt: null,
    });

    try {
      await this.syncActivities(userId, 30);
    } catch (error) {
      this.logger.warn(
        { err: error, userId },
        'Initial Strava sync failed after connect',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // HealthProvider — syncData (delegates to syncActivities)
  // ---------------------------------------------------------------------------

  async syncData(userId: string): Promise<HealthProviderSyncResult> {
    const result = await this.syncActivities(userId, 30);
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
  // Activity sync
  // ---------------------------------------------------------------------------

  async syncActivities(userId: string, limit = 30) {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const store = await this.tokens.readStore(userId);
    const connection = store.integrations?.strava;

    if (!connection) {
      throw new NotFoundException('Strava integration is not connected');
    }

    const validToken = await this.tokens.ensureValidAccessToken(
      userId,
      this.providerKey,
      connection,
      (conn) => this.refreshTokens(conn),
      60,
    );

    const params = new URLSearchParams({
      per_page: String(normalizedLimit),
      page: '1',
    });

    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${validToken}` },
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.warn(
        `Strava activities sync failed (${response.status}): ${body}`,
      );
      throw new BadRequestException(`strava_sync_failed_${response.status}`);
    }

    const rawActivities = (await response.json()) as Array<{
      id?: number;
      name?: string;
      type?: string;
      start_date?: string;
      timezone?: string;
      distance?: number;
      moving_time?: number;
      elapsed_time?: number;
      total_elevation_gain?: number;
      average_speed?: number;
      max_speed?: number;
      kudos_count?: number;
      calories?: number;
      average_heartrate?: number;
      max_heartrate?: number;
      map?: { summary_polyline?: string };
    }>;

    const items: StravaActivitySummary[] = rawActivities
      .filter((activity) => typeof activity.id === 'number')
      .map((activity) => ({
        id: activity.id as number,
        name: activity.name ?? 'Untitled activity',
        type: activity.type ?? 'Workout',
        startDate: activity.start_date ?? new Date().toISOString(),
        timezone: activity.timezone ?? 'UTC',
        distanceMeters: activity.distance ?? 0,
        movingTimeSeconds: activity.moving_time ?? 0,
        elapsedTimeSeconds: activity.elapsed_time ?? 0,
        elevationGainMeters: activity.total_elevation_gain ?? 0,
        averageSpeedMps: activity.average_speed ?? 0,
        maxSpeedMps: activity.max_speed ?? 0,
        kudosCount: activity.kudos_count ?? 0,
        calories:
          typeof activity.calories === 'number' ? activity.calories : null,
        averageHeartRate:
          typeof activity.average_heartrate === 'number'
            ? activity.average_heartrate
            : null,
        maxHeartRate:
          typeof activity.max_heartrate === 'number'
            ? activity.max_heartrate
            : null,
        polyline: activity.map?.summary_polyline ?? null,
      }));

    const existingRows = await this.db.workoutSession.findMany({
      where: {
        userId,
        source: 'STRAVA',
        externalProvider: 'strava',
        externalActivityId: {
          in: items.map((item) => String(item.id)),
        },
      },
      select: { externalActivityId: true },
    });

    const existingIds = new Set(
      existingRows
        .map((row) => row.externalActivityId)
        .filter((id): id is string => typeof id === 'string'),
    );

    const toCreate = items.filter((item) => !existingIds.has(String(item.id)));

    if (toCreate.length > 0) {
      await this.db.workoutSession.createMany({
        data: toCreate.map((item) => {
          const startDate = new Date(item.startDate);
          const startedAt = Number.isNaN(startDate.getTime())
            ? new Date()
            : startDate;
          const endedAt = new Date(
            startedAt.getTime() + item.elapsedTimeSeconds * 1000,
          );

          return {
            userId,
            title: item.name,
            performed: startedAt,
            startedAt,
            endedAt,
            privacy: 'PRIVATE',
            source: 'STRAVA',
            externalProvider: 'strava',
            externalActivityId: String(item.id),
            externalActivityType: item.type,
            externalSummary: {
              id: item.id,
              name: item.name,
              type: item.type,
              timezone: item.timezone,
              distanceMeters: item.distanceMeters,
              movingTimeSeconds: item.movingTimeSeconds,
              elapsedTimeSeconds: item.elapsedTimeSeconds,
              elevationGainMeters: item.elevationGainMeters,
              averageSpeedMps: item.averageSpeedMps,
              maxSpeedMps: item.maxSpeedMps,
              kudosCount: item.kudosCount,
              calories: item.calories,
              averageHeartRate: item.averageHeartRate,
              maxHeartRate: item.maxHeartRate,
              polyline: item.polyline,
              averagePaceSecPerKm:
                item.distanceMeters > 0 && item.movingTimeSeconds > 0
                  ? Math.round(
                      (item.movingTimeSeconds / (item.distanceMeters / 1000)) *
                        100,
                    ) / 100
                  : null,
            },
            importedAt: new Date(),
          };
        }),
        skipDuplicates: true,
      });
    }

    connection.lastSyncedAt = new Date().toISOString();
    store.integrations = store.integrations ?? {};
    store.integrations.strava = connection;
    await this.tokens.writeStore(userId, store);

    return {
      success: true as const,
      data: {
        importedCount: toCreate.length,
        lastSyncedAt: connection.lastSyncedAt,
        items,
      },
    };
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
        await fetch('https://www.strava.com/oauth/deauthorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            access_token: connection.accessToken,
          }),
        });
      } catch {
        // Ignore deauth network issues; local disconnect still succeeds.
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
    url.searchParams.set('strava', status);
    if (reason) {
      url.searchParams.set('reason', reason);
    }
    return url.toString();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async refreshTokens(connection: HealthProviderConnection) {
    const refreshed = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
      }),
    });

    if (!refreshed.ok) {
      const body = await refreshed.text();
      this.logger.warn(
        `Strava token refresh failed (${refreshed.status}): ${body}`,
      );
      throw new BadRequestException('strava_token_refresh_failed');
    }

    const tokenData = (await refreshed.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };

    if (
      !tokenData.access_token ||
      !tokenData.refresh_token ||
      !tokenData.expires_at
    ) {
      throw new BadRequestException('strava_token_refresh_payload_invalid');
    }

    connection.accessToken = tokenData.access_token;
    connection.refreshToken = tokenData.refresh_token;
    connection.expiresAt = tokenData.expires_at;
  }

  private assertConfigured() {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new ServiceUnavailableException(
        'Strava integration is not configured',
      );
    }
  }
}
