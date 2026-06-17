import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

const DLQ_NAMES = ['audit.dlq', 'notification.dlq'];

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  private readonly rabbitMQUrl: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.rabbitMQUrl = this.configService.getOrThrow<string>('RABBITMQ_URL');
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    let connection: any = null;

    try {
      // Connect to RabbitMQ
      connection = await amqp.connect(this.rabbitMQUrl);
      const responseTime = Date.now() - startTime;

      // Close the connection
      await connection.close();

      return this.getStatus(key, true, {
        responseTime: `${responseTime}ms`,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Make sure connection is closed even on error
      if (connection) {
        try {
          await connection.close();
        } catch {
          // Ignore close errors
        }
      }

      throw new HealthCheckError(
        'RabbitMQ check failed',
        this.getStatus(key, false, {
          responseTime: `${responseTime}ms`,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  async getDlqDepths(): Promise<Record<string, number>> {
    let connection: Awaited<ReturnType<typeof amqp.connect>> = null as any;
    try {
      connection = await amqp.connect(this.rabbitMQUrl);
      const channel = await connection.createChannel();

      const depths: Record<string, number> = {};
      for (const queueName of DLQ_NAMES) {
        try {
          const info = await channel.checkQueue(queueName);
          depths[queueName] = info.messageCount;
        } catch {
          depths[queueName] = -1; // queue doesn't exist yet
        }
      }

      await channel.close();
      await connection.close();
      return depths;
    } catch (error) {
      if (connection) {
        try {
          await connection.close();
        } catch {
          // Ignore close errors
        }
      }
      throw error;
    }
  }
}
