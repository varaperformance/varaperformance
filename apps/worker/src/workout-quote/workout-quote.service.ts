import { createHash } from "node:crypto";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "@app/database";

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface GeneratedQuote {
  quote: string;
  author: string;
}

const WORKOUT_QUOTE_JOB_METRIC_KEY = "worker.workoutQuote.lastRun";
const WORKOUT_QUOTE_JOB_ERROR_KEY = "worker.workoutQuote.lastError";
const WORKOUT_QUOTE_LOCK_KEY = 3_112_047;
const WORKOUT_QUOTE_THEMES = [
  "discipline",
  "consistency",
  "recovery",
  "intent",
  "execution",
  "focus",
  "resilience",
  "patience",
] as const;

@Injectable()
export class WorkoutQuoteService implements OnModuleInit {
  private readonly logger = new Logger(WorkoutQuoteService.name);
  private readonly ollamaBaseUrl: string;
  private readonly ollamaChatModel: string;
  private readonly ollamaTimeoutMs: number;
  private isProcessing = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.ollamaBaseUrl =
      this.configService.get<string>("OLLAMA_BASE_URL") ??
      "http://localhost:11434";
    this.ollamaChatModel =
      this.configService.get<string>("OLLAMA_CHAT_MODEL") ?? "gemma2:2b";
    this.ollamaTimeoutMs = Number(
      this.configService.get<string>("AI_WORKOUT_QUOTE_TIMEOUT_MS") ??
        this.configService.get<string>("AI_STACK_TIPS_TIMEOUT_MS") ??
        "60000",
    );
  }

  onModuleInit(): void {
    this.logger.log("Workout quote service initialized");
    setTimeout(() => {
      this.refreshWorkoutQuote().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Initial workout quote generation failed: ${message}`);
      });
    }, 8000);
  }

  @Cron("0 */30 * * * *")
  async refreshWorkoutQuote(): Promise<void> {
    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${WORKOUT_QUOTE_LOCK_KEY}) AS acquired
    `;
    const acquired = lockRows[0]?.acquired === true;

    if (!acquired) {
      this.logger.debug(
        "Skipping workout quote generation because another instance holds the lock",
      );
      return;
    }

    if (this.isProcessing) {
      this.logger.log("Workout quote generation already in progress, skipping");
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${WORKOUT_QUOTE_LOCK_KEY})
      `;
      return;
    }

    this.isProcessing = true;
    const startedAt = Date.now();

    await this.setMetric(
      WORKOUT_QUOTE_JOB_METRIC_KEY,
      JSON.stringify({
        status: "running",
        startedAt: new Date(startedAt).toISOString(),
      }),
    );

    try {
      const generated = await this.generateWorkoutQuote();
      if (!generated) {
        throw new Error("No quote generated from AI response");
      }

      const hash = this.computeHash(generated.quote, generated.author);

      const existing = await this.db.workoutQuote.findUnique({
        where: { hash },
        select: { id: true },
      });

      if (existing) {
        this.logger.log(
          `Quote already exists, skipping: "${generated.quote.slice(0, 50)}..."`,
        );
      } else {
        await this.db.workoutQuote.create({
          data: {
            quote: generated.quote,
            author: generated.author,
            hash,
            source: "ai",
          },
        });
        this.logger.log(
          `New quote saved: "${generated.quote.slice(0, 50)}..." — ${generated.author}`,
        );
      }

      await this.setMetric(
        WORKOUT_QUOTE_JOB_METRIC_KEY,
        JSON.stringify({
          status: "success",
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - startedAt,
        }),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await this.setMetric(
        WORKOUT_QUOTE_JOB_METRIC_KEY,
        JSON.stringify({
          status: "error",
          startedAt: new Date(startedAt).toISOString(),
          failedAt: new Date().toISOString(),
          message,
        }),
      );
      await this.setMetric(WORKOUT_QUOTE_JOB_ERROR_KEY, message);
      this.logger.error(`Workout quote generation failed: ${message}`);
    } finally {
      this.isProcessing = false;
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${WORKOUT_QUOTE_LOCK_KEY})
      `;
    }
  }

  private computeHash(quote: string, author: string): string {
    const normalized = `${quote.toLowerCase().trim()}|${author.toLowerCase().trim()}`;
    return createHash("sha256").update(normalized).digest("hex");
  }

  private async generateWorkoutQuote(): Promise<GeneratedQuote | null> {
    if (!this.ollamaBaseUrl || !this.ollamaChatModel) {
      return null;
    }

    const recentQuotes = await this.db.workoutQuote.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { quote: true, author: true },
    });

    const avoidList = recentQuotes
      .map((q) => `- "${q.quote}" — ${q.author}`)
      .join("\n");

    for (let attempt = 0; attempt < 4; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.ollamaTimeoutMs,
      );

      const theme = WORKOUT_QUOTE_THEMES[attempt % WORKOUT_QUOTE_THEMES.length];
      const nonce = `${Date.now()}-${attempt}-${Math.floor(Math.random() * 10_000)}`;

      const prompt = [
        "Give me one real, famous quote about fitness, strength, or perseverance.",
        "It MUST be a real quote from a known public figure (athlete, coach, philosopher, author, etc.).",
        "Do NOT invent or paraphrase. The quote must be accurately attributed.",
        `Theme preference: ${theme}.`,
        "No hashtags. No emojis. No profanity.",
        avoidList ? `Do NOT use any of these quotes:\n${avoidList}` : "",
        `Variation token: ${nonce}`,
        "Output strict JSON only.",
        '{"quote":"the exact quote text","author":"Full Name of the person"}',
        "The author field MUST be a real person's name, never null or empty.",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const res = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.ollamaChatModel,
            stream: false,
            format: "json",
            options: {
              temperature: 1.0,
              top_p: 0.95,
              repeat_penalty: 1.15,
            },
            messages: [
              {
                role: "system",
                content:
                  "You are a fitness quote librarian. Return only valid JSON with a real quote and its real author.",
              },
              { role: "user", content: prompt },
            ],
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "(unreadable)");
          throw new Error(`Ollama ${res.status}: ${body.slice(0, 300)}`);
        }

        const data = (await res.json()) as OllamaChatResponse;
        const candidate = this.parseQuote(data);
        if (!candidate) continue;

        const hash = this.computeHash(candidate.quote, candidate.author);
        const isDuplicate = await this.db.workoutQuote.findUnique({
          where: { hash },
          select: { id: true },
        });

        if (isDuplicate) {
          this.logger.debug(
            `Duplicate quote on attempt ${attempt + 1}, retrying`,
          );
          continue;
        }

        return candidate;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return null;
  }

  private parseQuote(response: OllamaChatResponse): GeneratedQuote | null {
    const content = response.message?.content;
    if (!content) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    if (typeof parsed !== "object" || parsed === null) return null;

    const rawQuote = (parsed as { quote?: unknown }).quote;
    const rawAuthor = (parsed as { author?: unknown }).author;
    if (typeof rawQuote !== "string") return null;
    if (typeof rawAuthor !== "string") return null;

    const quote = rawQuote.trim().replaceAll(/\s+/g, " ").slice(0, 300);
    if (!quote) return null;

    const author = rawAuthor.trim().replaceAll(/\s+/g, " ").slice(0, 100);
    if (
      !author ||
      author.toLowerCase() === "null" ||
      author.toLowerCase() === "unknown"
    ) {
      return null;
    }

    return { quote, author };
  }

  private async setMetric(key: string, value: string): Promise<void> {
    await this.db.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        updatedBy: "worker:workout-quote",
      },
      update: {
        value,
        updatedBy: "worker:workout-quote",
      },
    });
  }
}
