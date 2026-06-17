import { Controller, Logger } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { HealthSyncMessageSchema } from "@varaperformance/core";
import axios from "axios";

export const HEALTH_SYNC_PATTERN = "health.sync";

@Controller()
export class HealthSyncConsumer {
  private readonly logger = new Logger(HealthSyncConsumer.name);

  @EventPattern(HEALTH_SYNC_PATTERN)
  async handleHealthSync(
    @Payload() raw: unknown,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    const parsed = HealthSyncMessageSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error(
        { errors: parsed.error.issues, raw },
        "Invalid health sync payload — routing to DLQ",
      );
      channel.nack(originalMsg, false, false);
      return;
    }
    const data = parsed.data;

    try {
      const backendUrl = process.env.BACKEND_URL?.trim();
      const internalApiKey = process.env.INTERNAL_API_KEY?.trim();

      if (!backendUrl || !internalApiKey) {
        this.logger.warn(
          "Skipping health sync — BACKEND_URL or INTERNAL_API_KEY not configured",
        );
        channel.ack(originalMsg);
        return;
      }

      const baseUrl = backendUrl.replace(/\/$/, "");

      if (data.userId) {
        const url = `${baseUrl}/v1/integrations/${data.provider}/sync`;
        await axios.post(
          url,
          {},
          {
            timeout: 30_000,
            headers: { "x-internal-api-key": internalApiKey },
          },
        );

        this.logger.log(
          {
            provider: data.provider,
            userId: data.userId,
            trigger: data.trigger,
          },
          "Health sync completed for user",
        );
      } else {
        const url = `${baseUrl}/v1/integrations/health/internal/sync-all`;
        const response = await axios.post(
          url,
          { provider: data.provider, maxUsers: data.maxUsers },
          {
            timeout: 120_000,
            headers: { "x-internal-api-key": internalApiKey },
          },
        );

        this.logger.log(
          {
            provider: data.provider,
            trigger: data.trigger,
            result: response.data?.data,
          },
          "Health sync-all completed",
        );
      }

      channel.ack(originalMsg);
    } catch (err: unknown) {
      this.logger.error(
        { err, provider: data.provider, userId: data.userId },
        "Health sync job failed",
      );

      if (originalMsg?.fields?.redelivered) {
        this.logger.warn(
          { provider: data.provider },
          "Health sync message failed after retry — routing to DLQ",
        );
        channel.nack(originalMsg, false, false);
        return;
      }

      channel.nack(originalMsg, false, true);
    }
  }
}
