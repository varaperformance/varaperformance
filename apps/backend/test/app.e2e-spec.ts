import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthCheckService } from '@nestjs/terminus';
import { SystemHealthController } from '../src/system-health/system-health.controller';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  RabbitMQHealthIndicator,
} from '../src/system-health/indicators';

// Mock health indicators
const mockHealthCheckService = {
  check: jest.fn().mockResolvedValue({
    status: 'ok',
    info: { database: { status: 'up' }, redis: { status: 'up' } },
    error: {},
    details: { database: { status: 'up' }, redis: { status: 'up' } },
  }),
};

const mockDatabaseHealth = {
  isHealthy: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
};
const mockRedisHealth = {
  isHealthy: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
};
const mockRabbitmqHealth = {
  isHealthy: jest.fn().mockResolvedValue({ rabbitmq: { status: 'up' } }),
};
describe('SystemHealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SystemHealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: DatabaseHealthIndicator, useValue: mockDatabaseHealth },
        { provide: RedisHealthIndicator, useValue: mockRedisHealth },
        { provide: RabbitMQHealthIndicator, useValue: mockRabbitmqHealth },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: VERSION_NEUTRAL,
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) - liveness probe', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });
});
