import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@app/database';
import { EncryptionService } from '@app/security';
import type {
  HealthProviderConnection,
  IntegrationStore,
} from './health-provider.interface';

@Injectable()
export class HealthTokenService {
  private readonly logger = new Logger(HealthTokenService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  // ---------------------------------------------------------------------------
  // Store-level read / write (encrypted KeyStore row)
  // ---------------------------------------------------------------------------

  async readStore(userId: string): Promise<IntegrationStore> {
    const keyStore = await this.db.keyStore.findUnique({
      where: { userId },
      select: {
        eKey: true,
        keyIv: true,
        keyAuthTag: true,
        keyWrappedKey: true,
      },
    });

    if (
      !keyStore ||
      !keyStore.eKey ||
      !keyStore.keyIv ||
      !keyStore.keyAuthTag ||
      !keyStore.keyWrappedKey
    ) {
      return {};
    }

    const decrypted = this.encryption.decrypt({
      encryptedContent: Buffer.from(keyStore.eKey),
      contentIv: Buffer.from(keyStore.keyIv),
      contentAuthTag: Buffer.from(keyStore.keyAuthTag),
      wrappedKey: Buffer.from(keyStore.keyWrappedKey),
    });

    try {
      const parsed = JSON.parse(decrypted.toString()) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as IntegrationStore;
      }
      return {};
    } catch {
      return {};
    }
  }

  async writeStore(userId: string, data: IntegrationStore): Promise<void> {
    const encrypted = this.encryption.encrypt(JSON.stringify(data));

    await this.db.keyStore.upsert({
      where: { userId },
      create: {
        userId,
        eKey: encrypted.encryptedContent,
        keyIv: encrypted.contentIv,
        keyAuthTag: encrypted.contentAuthTag,
        keyWrappedKey: encrypted.wrappedKey,
      },
      update: {
        eKey: encrypted.encryptedContent,
        keyIv: encrypted.contentIv,
        keyAuthTag: encrypted.contentAuthTag,
        keyWrappedKey: encrypted.wrappedKey,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Provider connection helpers
  // ---------------------------------------------------------------------------

  async getConnection(
    userId: string,
    provider: string,
  ): Promise<HealthProviderConnection | null> {
    const store = await this.readStore(userId);
    return (store.integrations?.[provider] as HealthProviderConnection) ?? null;
  }

  async setConnection(
    userId: string,
    provider: string,
    connection: HealthProviderConnection,
  ): Promise<void> {
    const store = await this.readStore(userId);
    store.integrations = store.integrations ?? {};
    store.integrations[provider] = connection;
    await this.writeStore(userId, store);
  }

  async removeConnection(userId: string, provider: string): Promise<void> {
    const store = await this.readStore(userId);
    if (store.integrations?.[provider]) {
      delete store.integrations[provider];
    }
    if (store.oauthState?.[provider]) {
      delete store.oauthState[provider];
    }
    await this.writeStore(userId, store);
  }

  // ---------------------------------------------------------------------------
  // OAuth state (nonce) management
  // ---------------------------------------------------------------------------

  buildOAuthState(userId: string, nonce: string): string {
    return `${userId}:${nonce}`;
  }

  parseOAuthState(raw: string): { userId: string; nonce: string } | null {
    const [userId, nonce] = raw.split(':');
    if (!userId || !nonce) return null;
    return { userId, nonce };
  }

  async setOAuthNonce(
    userId: string,
    provider: string,
    nonce: string,
  ): Promise<void> {
    const store = await this.readStore(userId);
    store.oauthState = store.oauthState ?? {};
    store.oauthState[provider] = { state: nonce, createdAt: Date.now() };
    await this.writeStore(userId, store);
  }

  async validateAndConsumeNonce(
    userId: string,
    provider: string,
    nonce: string,
    ttlMs: number,
  ): Promise<void> {
    const store = await this.readStore(userId);
    const saved = store.oauthState?.[provider];

    if (!saved) {
      throw new BadRequestException(`${provider}_state_missing`);
    }

    const ageMs = Date.now() - saved.createdAt;
    if (saved.state !== nonce || ageMs > ttlMs) {
      throw new BadRequestException(`${provider}_state_invalid`);
    }

    delete store.oauthState![provider];
    await this.writeStore(userId, store);
  }

  // ---------------------------------------------------------------------------
  // Token refresh
  // ---------------------------------------------------------------------------

  /**
   * Returns the current access token if still valid, otherwise invokes `refreshFn`
   * to obtain new tokens and persists immediately so refreshed tokens are never lost.
   *
   * @param userId       - user owning the connection (for persistence)
   * @param provider     - provider key (for persistence)
   * @param connection   - mutable connection object; `refreshFn` must mutate it
   * @param refreshFn    - provider-specific function that refreshes tokens in-place
   * @param bufferSec    - how many seconds before expiry to trigger a refresh (default 120)
   */
  async ensureValidAccessToken(
    userId: string,
    provider: string,
    connection: HealthProviderConnection,
    refreshFn: (conn: HealthProviderConnection) => Promise<void>,
    bufferSec = 120,
  ): Promise<string> {
    const nowSec = Math.floor(Date.now() / 1000);
    if (connection.expiresAt - nowSec > bufferSec) {
      return connection.accessToken;
    }

    await refreshFn(connection);

    // Persist immediately so refreshed tokens survive even if the subsequent
    // sync call fails — fixes the known Strava token-loss bug.
    const store = await this.readStore(userId);
    store.integrations = store.integrations ?? {};
    store.integrations[provider] = {
      ...store.integrations[provider],
      ...connection,
    };
    await this.writeStore(userId, store);

    this.logger.debug(
      { userId, provider },
      'Access token refreshed and persisted',
    );
    return connection.accessToken;
  }
}
