import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { RedisService } from '@app/database/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    try {
      const client = this.redis.getClient();
      const pong = await client.ping();
      const responseTime = Date.now() - startTime;

      if (pong !== 'PONG') {
        throw new Error(`Unexpected ping response: ${String(pong)}`);
      }

      // Get some useful stats
      const info = await client.info('memory');
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
        memoryUsed,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, {
          responseTime: `${responseTime}ms`,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
