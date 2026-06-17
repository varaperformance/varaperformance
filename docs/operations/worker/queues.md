# Worker Queue Contracts

## Audit Log Queue

- **Queue name:** `audit`
- **Pattern / routing key:** `audit.log`
- **Producer:** Backend `AuditService` (`client.emit('audit.log', payload)`).
- **Consumer:** Worker `AuditConsumer` with `@EventPattern('audit.log')`.
- **Delivery:** At-least-once, manual ack/nack.

### Payload Schema

```json
{
  "userId": "string | null",
  "action": "CREATE|READ|UPDATE|DELETE|LOGIN|LOGOUT|FAILED_LOGIN|PASSWORD_CHANGE|EXPORT|CONSENT_GRANTED|CONSENT_REVOKED",
  "resource": "string",
  "resourceId": "string | null",
  "ipAddress": "string | null",
  "userAgent": "string | null",
  "metadata": { "...": "any" },
  "oldValue": { "...": "any" },
  "newValue": { "...": "any" },
  "timestamp": "ISO8601 string"
}
```

### Processing Rules

- Persist to `auditLog` table via Prisma.
- **Ack** only after successful DB write.
- **Nack (requeue=true)** on first transient failure.
- **Nack (requeue=false)** on redelivered failure, routing to `audit.dlq`.
- Worker bootstrap ensures queue topology for `audit`, `notification`, and their DLQs.
- Keep inserts **idempotent** by using a deterministic `messageId` (e.g., hash
  of `timestamp + userId + action + resource + resourceId`) if you add a unique
  constraint later.

### Observability

- Logs: Pino structured logs from worker.
- Metrics (suggested):
  - `worker_audit_processed_total{status=ok|error}`
  - `worker_audit_duration_ms` histogram
  - `worker_audit_inflight`
- Traces (suggested): propagate trace headers if added to producer.

### Timeouts & Backpressure

- Keep consumer lightweight; avoid long-running work in the handler.
- If processing expands, hand off to an internal queue or job runner and ack
  after enqueue.

## Operational Runbook

- **Health:** worker starts only if `DATABASE_URL` and `RABBITMQ_URL` are
  reachable. RabbitMQ must be up before starting.
- **Env vars:**
  - `DATABASE_URL` — required for Prisma
  - `RABBITMQ_URL` — broker connection
  - `WORKER_QUEUE` — defaults to `audit`
- **Start:** `pnpm dev:worker` (or `pnpm dev:workspace` with backend)
- **Common failures:**
  - `ECONNREFUSED` to RabbitMQ → ensure container running and `5672` reachable.
  - `DATABASE_URL not set` → set in `apps/worker/.env`.
  - DLQ growth (`audit.dlq`, `notification.dlq`) → inspect poison messages and fix payload/schema issues.

## Future Queues (placeholders)

Add new sections per queue:

- **Name / pattern / producer / consumer**
- **Payload schema** (JSON example)
- **Idempotency key**
- **Ack/Nack policy**
- **DLQ routing**
- **SLAs** (latency, max retry)
