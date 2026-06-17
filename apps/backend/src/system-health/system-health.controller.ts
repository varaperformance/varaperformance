import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from 'src/idm/decorators/public.decorator';
import { Permissions } from 'src/idm/decorators/permissions.decorator';
import { SkipAudit } from '@app/common/audit';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  RabbitMQHealthIndicator,
  StripeHealthIndicator,
} from './indicators';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
@SkipThrottle()
@SkipAudit()
export class SystemHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly rabbitmq: RabbitMQHealthIndicator,
    private readonly stripe: StripeHealthIndicator,
  ) {}

  /**
   * Basic liveness probe - just checks if the service is running
   */
  @Get()
  @Public()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.database.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  /**
   * Full readiness probe - checks all dependencies
   */
  @Get('ready')
  @Public()
  @HealthCheck()
  async checkReady(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.database.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.rabbitmq.isHealthy('rabbitmq'),
    ]);
  }

  /**
   * Full health check - all services including external APIs
   */
  @Get('full')
  @Public()
  @HealthCheck()
  async checkFull(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.database.isHealthy('database'),
      () => this.redis.isHealthy('redis'),
      () => this.rabbitmq.isHealthy('rabbitmq'),
    ]);
  }

  /**
   * Individual service health checks
   */
  @Get('database')
  @Public()
  @HealthCheck()
  async checkDatabase(): Promise<HealthCheckResult> {
    return this.health.check([() => this.database.isHealthy('database')]);
  }

  @Get('redis')
  @Public()
  @HealthCheck()
  async checkRedis(): Promise<HealthCheckResult> {
    return this.health.check([() => this.redis.isHealthy('redis')]);
  }

  @Get('rabbitmq')
  @Public()
  @HealthCheck()
  async checkRabbitMQ(): Promise<HealthCheckResult> {
    return this.health.check([() => this.rabbitmq.isHealthy('rabbitmq')]);
  }

  @Get('stripe')
  @Public()
  @HealthCheck()
  async checkStripe(): Promise<HealthCheckResult> {
    return this.health.check([() => this.stripe.isHealthy('stripe')]);
  }

  @Get('dlq')
  @Version([VERSION_NEUTRAL, '1'])
  @Permissions('admin:read')
  async checkDlq(): Promise<Record<string, number>> {
    return this.rabbitmq.getDlqDepths();
  }
}
