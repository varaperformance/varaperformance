import { Controller, Logger } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { DatabaseService } from "@app/database";
import { EncryptionService } from "@app/security";
import { createHash } from "crypto";
import {
  AuditLogMessageSchema,
  type AuditLogMessage,
} from "@varaperformance/core";

export const AUDIT_LOG_PATTERN = "audit.log";

/** Derive a stable idempotency key from the message payload. */
function deriveIdempotencyKey(data: AuditLogMessage): string {
  if (data.idempotencyKey) return data.idempotencyKey;
  const payload = `${data.userId ?? ""}:${data.action}:${data.resource}:${data.resourceId ?? ""}:${data.timestamp}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

@Controller()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly encryption: EncryptionService,
  ) {}

  @EventPattern(AUDIT_LOG_PATTERN)
  async handleAuditLog(
    @Payload() raw: unknown,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const parsed = AuditLogMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error(
        { errors: parsed.error.issues, raw },
        "Invalid audit log payload — routing to DLQ",
      );
      channel.nack(originalMsg, false, false);
      return;
    }
    const data = parsed.data;

    try {
      const idempotencyKey = deriveIdempotencyKey(data);

      // Deduplicate: skip if this exact event was already persisted
      const existing = await this.db.auditLog.findFirst({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        this.logger.debug({ idempotencyKey }, "Duplicate audit log skipped");
        channel.ack(originalMsg);
        return;
      }

      await this.db.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          ...this.encryptAuditMeta(data.ipAddress, data.userAgent),
          metadata: data.metadata as object | undefined,
          oldValue: data.oldValue as object | undefined,
          newValue: data.newValue as object | undefined,
          idempotencyKey,
        },
      });

      this.logger.debug(
        {
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          userId: data.userId,
        },
        "Audit log persisted",
      );

      // Acknowledge message after successful persistence
      channel.ack(originalMsg);
    } catch (err: unknown) {
      // Race-condition dedup: another consumer already inserted this key
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        this.logger.debug(
          { idempotencyKey: deriveIdempotencyKey(data) },
          "Duplicate audit log (constraint race) — acking",
        );
        channel.ack(originalMsg);
        return;
      }

      this.logger.error({ err, data }, "Failed to persist audit log");

      // First failure is retried once, then routed to DLQ via queue dead-letter args.
      if (originalMsg?.fields?.redelivered) {
        this.logger.warn(
          {
            action: data.action,
            resource: data.resource,
            resourceId: data.resourceId,
          },
          "Audit log message failed after retry and was sent to DLQ",
        );
        channel.nack(originalMsg, false, false);
        return;
      }

      channel.nack(originalMsg, false, true);
    }
  }

  private encryptAuditMeta(ipAddress?: string, userAgent?: string) {
    if (!ipAddress && !userAgent) return {};
    const payload = JSON.stringify({ ipAddress, userAgent });
    const enc = this.encryption.encrypt(payload);
    return {
      eAuditMeta: enc.encryptedContent,
      auditMetaIv: enc.contentIv,
      auditMetaAuthTag: enc.contentAuthTag,
      auditMetaWrappedKey: enc.wrappedKey,
    };
  }
}
