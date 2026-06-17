import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import type { HealthSyncTrigger } from '@varaperformance/core';

export const HEALTH_SYNC_SERVICE = 'HEALTH_SYNC_SERVICE';
export const HEALTH_SYNC_QUEUE = 'health.sync';
export const HEALTH_SYNC_PATTERN = 'health.sync';

@Injectable()
export class HealthSyncQueueService {
  constructor(
    @Inject(HEALTH_SYNC_SERVICE) private readonly client: ClientProxy,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HealthSyncQueueService.name);
  }

  enqueue(input: {
    provider: string;
    userId?: string;
    trigger: HealthSyncTrigger;
    maxUsers?: number;
    idempotencyKey?: string;
  }): void {
    try {
      void this.client.emit(HEALTH_SYNC_PATTERN, {
        ...input,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        {
          provider: input.provider,
          userId: input.userId,
          trigger: input.trigger,
        },
        'Health sync job queued',
      );
    } catch (err: unknown) {
      this.logger.error({ err, input }, 'Failed to queue health sync job');
    }
  }

  enqueueScheduledSync(provider: string, maxUsers?: number): void {
    this.enqueue({ provider, trigger: 'scheduled', maxUsers });
  }

  enqueueUserSync(provider: string, userId: string): void {
    this.enqueue({ provider, userId, trigger: 'manual' });
  }
}
