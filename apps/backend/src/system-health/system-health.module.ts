import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { SystemHealthController } from './system-health.controller';
import {
  DatabaseHealthIndicator,
  RedisHealthIndicator,
  RabbitMQHealthIndicator,
  StripeHealthIndicator,
} from './indicators';
import { DatabaseModule } from '@app/database';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    DatabaseModule,
    ConfigModule,
    PaymentModule,
  ],
  controllers: [SystemHealthController],
  providers: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    RabbitMQHealthIndicator,
    StripeHealthIndicator,
  ],
  exports: [
    DatabaseHealthIndicator,
    RedisHealthIndicator,
    RabbitMQHealthIndicator,
    StripeHealthIndicator,
  ],
})
export class SystemHealthModule {}
