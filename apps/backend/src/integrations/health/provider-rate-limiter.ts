import { Injectable, Logger } from '@nestjs/common';

interface ProviderQuota {
  maxRequests: number;
  windowMs: number;
}

const PROVIDER_QUOTAS: Record<string, ProviderQuota> = {
  strava: { maxRequests: 100, windowMs: 15 * 60 * 1000 },
  withings: { maxRequests: 120, windowMs: 60 * 1000 },
  whoop: { maxRequests: 100, windowMs: 60 * 1000 },
  garmin: { maxRequests: 240, windowMs: 15 * 60 * 1000 },
};

const DEFAULT_QUOTA: ProviderQuota = {
  maxRequests: 60,
  windowMs: 60 * 1000,
};

/**
 * In-memory sliding-window rate limiter scoped per provider.
 * Tracks request timestamps and evicts expired entries on each check.
 *
 * For single-instance deployments this is sufficient.  If horizontal
 * scaling is needed, swap the backing store with Redis sorted sets.
 */
@Injectable()
export class ProviderRateLimiter {
  private readonly logger = new Logger(ProviderRateLimiter.name);
  private readonly windows = new Map<string, number[]>();

  canProceed(provider: string): boolean {
    const quota = PROVIDER_QUOTAS[provider] ?? DEFAULT_QUOTA;
    const now = Date.now();
    const timestamps = this.getTimestamps(provider);

    this.evictExpired(timestamps, now, quota.windowMs);
    return timestamps.length < quota.maxRequests;
  }

  consume(provider: string): void {
    const timestamps = this.getTimestamps(provider);
    timestamps.push(Date.now());
  }

  /**
   * Waits until a rate-limit slot is available.
   * Resolves immediately if under the limit; otherwise polls with
   * exponential backoff capped at 5 seconds.
   */
  async waitForSlot(provider: string): Promise<void> {
    let delay = 100;
    while (!this.canProceed(provider)) {
      this.logger.debug(
        { provider, delayMs: delay },
        'Rate limit reached — waiting for slot',
      );
      await this.sleep(delay);
      delay = Math.min(delay * 2, 5000);
    }
    this.consume(provider);
  }

  private getTimestamps(provider: string): number[] {
    let ts = this.windows.get(provider);
    if (!ts) {
      ts = [];
      this.windows.set(provider, ts);
    }
    return ts;
  }

  private evictExpired(
    timestamps: number[],
    now: number,
    windowMs: number,
  ): void {
    const cutoff = now - windowMs;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Exponential backoff utility
// ---------------------------------------------------------------------------

export interface BackoffOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

/**
 * Wraps an async function with exponential backoff for transient failures.
 * Retries on errors whose `status` property is in `retryableStatuses`
 * (defaults to 429 and 5xx).
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  opts: BackoffOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    retryableStatuses = [429, 500, 502, 503, 504],
  } = opts;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status: number }).status
          : undefined;

      const isRetryable =
        status !== undefined && retryableStatuses.includes(status);

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const jitter = Math.random() * 0.3 + 0.85;
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) * jitter,
        maxDelayMs,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
