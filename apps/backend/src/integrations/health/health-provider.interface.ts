/**
 * Shared contracts for health integration providers (Strava, Withings, WHOOP, Garmin, etc.).
 *
 * Every provider implements `HealthProvider` so that `HealthSyncService` can
 * orchestrate connect / sync / disconnect generically.
 */

export interface HealthProviderConnection {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  connectedAt: string;
  lastSyncedAt?: string | null;
  [key: string]: unknown;
}

export interface HealthProviderSyncResult {
  importedCount: number;
  lastSyncedAt: string;
}

export interface HealthProvider {
  /** Lowercase provider key stored in the KeyStore JSON, e.g. `'strava'`, `'withings'`. */
  readonly providerKey: string;

  getStatus(userId: string): Promise<unknown>;
  createConnectUrl(userId: string): Promise<{ authorizeUrl: string }>;
  handleCallback(userId: string, code: string, state: string): Promise<void>;
  syncData(userId: string): Promise<HealthProviderSyncResult>;
  disconnect(userId: string): Promise<void>;
  isConnected(userId: string): Promise<boolean>;
}

/**
 * Shape of the encrypted JSON blob persisted in the `KeyStore` row.
 * Each provider stores its connection under `integrations.<providerKey>` and
 * its OAuth nonce under `oauthState.<providerKey>`.  The store may also hold
 * provider-specific extra keys (e.g. `seenMeasureGrpIds` for Withings).
 */
export type IntegrationStore = {
  integrations?: Record<string, HealthProviderConnection | undefined>;
  oauthState?: Record<string, { state: string; createdAt: number } | undefined>;
  [key: string]: unknown;
};

export const HEALTH_PROVIDER = Symbol('HEALTH_PROVIDER');
