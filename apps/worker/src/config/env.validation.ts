import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  BACKEND_URL: z.string().url(),
  INTERNAL_API_KEY: z.string().min(1),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_CHAT_MODEL: z.string().optional(),
  OLLAMA_FALLBACK_MODEL: z.string().optional(),
  HEALTH_MONITOR_TIMEOUT_MS: z.coerce.number().positive().optional(),
  AI_STACK_TIPS_TIMEOUT_MS: z.coerce.number().positive().optional(),
  AI_EXERCISE_DESC_TIMEOUT_MS: z.coerce.number().positive().optional(),
  AI_WORKOUT_QUOTE_TIMEOUT_MS: z.coerce.number().positive().optional(),
  NOTIFICATION_DIGEST_MIN_UNREAD: z.coerce.number().int().positive().optional(),
  NOTIFICATION_DIGEST_HOUR: z.coerce.number().int().min(0).max(23).optional(),
});

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Worker environment validation failed:\n${formatted}`);
  }
  return result.data;
}
