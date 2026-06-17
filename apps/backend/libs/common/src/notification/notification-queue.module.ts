import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  NotificationQueueService,
  NOTIFICATION_SERVICE,
  NOTIFICATION_QUEUE,
} from './notification-queue.service';

const NOTIFICATION_DLQ = 'notification.dlq';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: NOTIFICATION_SERVICE,
        useFactory: () => {
          const rabbitMqUrl = process.env.RABBITMQ_URL;
          if (!rabbitMqUrl) {
            throw new Error('RABBITMQ_URL environment variable is required');
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue: NOTIFICATION_QUEUE,
              queueOptions: {
                durable: true,
                arguments: {
                  'x-dead-letter-exchange': '',
                  'x-dead-letter-routing-key': NOTIFICATION_DLQ,
                },
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [NotificationQueueService],
  exports: [NotificationQueueService],
})
export class NotificationQueueModule {}
