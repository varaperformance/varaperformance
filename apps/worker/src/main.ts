import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { connect } from "amqplib";
import { AppModule } from "./app.module";

const AUDIT_QUEUE = "audit";
const NOTIFICATION_QUEUE = "notification";
const HEALTH_SYNC_QUEUE = "health.sync";
const AUDIT_DLQ = "audit.dlq";
const NOTIFICATION_DLQ = "notification.dlq";
const HEALTH_SYNC_DLQ = "health.sync.dlq";

const RETRY_QUEUE_ARGS = (deadLetterRoutingKey: string) => ({
  "x-dead-letter-exchange": "",
  "x-dead-letter-routing-key": deadLetterRoutingKey,
});

async function setupQueueTopology(rmqUrl: string, logger: Logger) {
  const connection = await connect(rmqUrl);
  const channel = await connection.createChannel();

  try {
    // Assert DLQs
    await channel.assertQueue(AUDIT_DLQ, { durable: true });
    await channel.assertQueue(NOTIFICATION_DLQ, { durable: true });
    await channel.assertQueue(HEALTH_SYNC_DLQ, { durable: true });

    // Assert main queues (idempotent — creates if missing, no-op if exists with same args)
    await channel.assertQueue(AUDIT_QUEUE, {
      durable: true,
      arguments: RETRY_QUEUE_ARGS(AUDIT_DLQ),
    });
    await channel.assertQueue(NOTIFICATION_QUEUE, {
      durable: true,
      arguments: RETRY_QUEUE_ARGS(NOTIFICATION_DLQ),
    });
    await channel.assertQueue(HEALTH_SYNC_QUEUE, {
      durable: true,
      arguments: RETRY_QUEUE_ARGS(HEALTH_SYNC_DLQ),
    });

    logger.log(
      `RabbitMQ queue topology ensured: ${AUDIT_QUEUE}, ${NOTIFICATION_QUEUE}, ${HEALTH_SYNC_QUEUE}, ${AUDIT_DLQ}, ${NOTIFICATION_DLQ}, ${HEALTH_SYNC_DLQ}`,
    );
  } finally {
    await channel.close();
    await connection.close();
  }
}

async function bootstrap(): Promise<void> {
  const rmqUrl = process.env.RABBITMQ_URL;
  if (!rmqUrl) {
    throw new Error("RABBITMQ_URL environment variable is required");
  }
  const logger = new Logger("WorkerBootstrap");

  await setupQueueTopology(rmqUrl, logger);

  // Create the base application (needed for hybrid approach)
  const app = await NestFactory.create(AppModule);

  // Connect to audit queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: AUDIT_QUEUE,
      queueOptions: {
        durable: true,
        arguments: RETRY_QUEUE_ARGS(AUDIT_DLQ),
      },
      prefetchCount: 20,
      noAck: false,
    },
  });

  // Connect to notification queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: NOTIFICATION_QUEUE,
      queueOptions: {
        durable: true,
        arguments: RETRY_QUEUE_ARGS(NOTIFICATION_DLQ),
      },
      prefetchCount: 20,
      noAck: false,
    },
  });

  // Connect to health sync queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: HEALTH_SYNC_QUEUE,
      queueOptions: {
        durable: true,
        arguments: RETRY_QUEUE_ARGS(HEALTH_SYNC_DLQ),
      },
      prefetchCount: 5,
      noAck: false,
    },
  });

  // Initialize the app (calls lifecycle hooks like onModuleInit)
  await app.init();

  await app.startAllMicroservices();
  logger.log(
    `Worker microservice listening on queues: ${AUDIT_QUEUE}, ${NOTIFICATION_QUEUE}, ${HEALTH_SYNC_QUEUE}`,
  );
}

void bootstrap();
