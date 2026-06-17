# Vara Performance — Worker

RabbitMQ-driven NestJS microservice that processes audit events and persists
them to PostgreSQL via Prisma.

## Tech Stack

- **Framework** — NestJS 11 (microservices)
- **Language** — TypeScript 5
- **Broker** — RabbitMQ (amqplib)
- **Database** — PostgreSQL via Prisma
- **Logging** — Pino

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- RabbitMQ reachable at `RABBITMQ_URL`
- PostgreSQL reachable at `DATABASE_URL`

## Environment

Create `apps/worker/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydatabase
RABBITMQ_URL=amqp://guest:guest@localhost:5672
WORKER_QUEUE=audit
```

## Development

```bash
pnpm dev:worker          # watch mode
pnpm dev:workspace       # backend + worker together
pnpm --filter @varaperformance/worker build
pnpm --filter @varaperformance/worker lint
pnpm --filter @varaperformance/worker format
```

## Documentation

- Worker docs: [../../docs/worker/README.md](../../docs/worker/README.md)
- Backend audit producer: [../../docs/backend/AUDIT.md](../../docs/backend/AUDIT.md)

## Notes

- Consumer entry: `@EventPattern('audit.log')` in `src/audit/audit.consumer.ts`
- Manual ack/nack is enabled; ensure RabbitMQ is running before starting the worker.
