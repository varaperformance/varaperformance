import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuditService, AUDIT_SERVICE, AUDIT_QUEUE } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';

const AUDIT_DLQ = 'audit.dlq';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUDIT_SERVICE,
        useFactory: () => {
          const rabbitMqUrl = process.env.RABBITMQ_URL;
          if (!rabbitMqUrl) {
            throw new Error('RABBITMQ_URL environment variable is required');
          }

          return {
            transport: Transport.RMQ,
            options: {
              urls: [rabbitMqUrl],
              queue: AUDIT_QUEUE,
              queueOptions: {
                durable: true,
                arguments: {
                  'x-dead-letter-exchange': '',
                  'x-dead-letter-routing-key': AUDIT_DLQ,
                },
              },
            },
          };
        },
      },
    ]),
  ],
  providers: [AuditService, AuditInterceptor],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
