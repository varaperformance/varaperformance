import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { DatabaseService } from '@app/database';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private readonly db: DatabaseService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    try {
      // Execute a simple query to verify database connectivity
      await this.db.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, {
          responseTime: `${responseTime}ms`,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }
}
