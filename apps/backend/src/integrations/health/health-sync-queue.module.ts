import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  HealthSyncQueueService,
  HEALTH_SYNC_SERVICE,
  HEALTH_SYNC_QUEUE,
} from './health-sync-queue.service';

const HEALTH_SYNC_DLQ = 'health.sync.dlq';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: HEALTH_SYNC_SERVICE,
        useFactory: () => {
          const rabbitMqUrl = process.env.RABBITMQ_URL;
          if (!rabbitMqUrl) {
            throw new Error('RABBITMQ_URL environment variable is required');
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue: HEALTH_SYNC_QUEUE,
              queueOptions: {
                durable: true,
                arguments: {
                  'x-dead-letter-exchange': '',
                  'x-dead-letter-routing-key': HEALTH_SYNC_DLQ,
                },
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [HealthSyncQueueService],
  exports: [HealthSyncQueueService],
})
export class HealthSyncQueueModule {}
