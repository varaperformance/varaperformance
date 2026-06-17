import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "@app/database";

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface ExerciseRow {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  instructions: string[];
  muscleGroups: { muscleGroup: string; isPrimary: boolean }[];
  equipmentNeeded: { equipment: string; isRequired: boolean }[];
}

const LOCK_KEY = 1_904_050;
const METRIC_KEY = "worker.exerciseDescriptions.lastRun";
const BATCH_SIZE = 10;

@Injectable()
export class ExerciseDescriptionsService implements OnModuleInit {
  private readonly logger = new Logger(ExerciseDescriptionsService.name);
  private readonly ollamaBaseUrl: string;
  private readonly ollamaChatModel: string;
  private readonly ollamaFallbackModel: string;
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
    this.ollamaFallbackModel =
      this.configService.get<string>("OLLAMA_FALLBACK_MODEL") ?? "gemma2:2b";
    this.ollamaTimeoutMs = Number(
      this.configService.get<string>("AI_EXERCISE_DESC_TIMEOUT_MS") ?? "120000",
    );
  }

  onModuleInit(): void {
    this.logger.log("Exercise descriptions service initialized");
    setTimeout(() => {
      this.processPlaceholderDescriptions().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Initial exercise description run failed: ${message}`);
      });
    }, 15_000);
  }

  @Cron("0 */10 * * * *")
  async processPlaceholderDescriptions(): Promise<void> {
    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${LOCK_KEY}) AS acquired
    `;

    if (!lockRows[0]?.acquired) {
      this.logger.debug("Skipping: another instance holds the lock");
      return;
    }

    if (this.isProcessing) {
      this.logger.log("Already in progress, skipping...");
      await this.db.$queryRaw`SELECT pg_advisory_unlock(${LOCK_KEY})`;
      return;
    }

    this.isProcessing = true;
    const startedAt = Date.now();

    try {
      const exercises = await this.db.exercise.findMany({
        where: {
          OR: [
            { description: { contains: "imported from ExerciseDB" } },
            { description: "" },
          ],
        },
        include: {
          muscleGroups: true,
          equipmentNeeded: true,
        },
        take: BATCH_SIZE,
      });

      if (exercises.length === 0) {
        this.logger.log("No exercises need description updates.");
        await this.setMetric({
          status: "idle",
          message: "No exercises pending",
          lastChecked: new Date().toISOString(),
        });
        return;
      }

      this.logger.log(
        `Processing ${exercises.length} exercises with placeholder descriptions`,
      );

      let updatedCount = 0;

      for (const exercise of exercises) {
        try {
          const description = await this.generateWithRetry(exercise);
          if (description) {
            await this.db.exercise.update({
              where: { id: exercise.id },
              data: { description },
            });
            updatedCount++;
            this.logger.log(`Updated description for: ${exercise.name}`);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Failed to generate description for '${exercise.name}': ${message}`,
          );
        }

        // Pause between requests to avoid overwhelming Ollama on CPU
        await this.sleep(3000);
      }

      const durationMs = Date.now() - startedAt;
      await this.setMetric({
        status: "success",
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs,
        updatedCount,
        batchSize: exercises.length,
      });

      this.logger.log(
        `Exercise description batch complete: ${updatedCount}/${exercises.length} updated in ${durationMs}ms`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.setMetric({
        status: "error",
        startedAt: new Date(startedAt).toISOString(),
        failedAt: new Date().toISOString(),
        message,
      });
      this.logger.error(`Exercise description job failed: ${message}`);
    } finally {
      this.isProcessing = false;
      await this.db.$queryRaw`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    }
  }

  private async generateWithRetry(
    exercise: ExerciseRow,
    maxRetries = 1,
  ): Promise<string | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const model =
        attempt === maxRetries
          ? this.ollamaFallbackModel
          : this.ollamaChatModel;

      try {
        return await this.generateDescription(exercise, model);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isRetryable =
          message.includes("unexpected EOF") || message.includes("Ollama 500");

        if (!isRetryable || attempt === maxRetries) throw error;

        const delay = (attempt + 1) * 5000;
        this.logger.debug(
          `Retrying '${exercise.name}' with ${attempt + 1 === maxRetries ? "fallback model" : "same model"} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await this.sleep(delay);
      }
    }
    return null;
  }

  private async generateDescription(
    exercise: ExerciseRow,
    model?: string,
  ): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.ollamaTimeoutMs,
    );

    const primaryMuscles = exercise.muscleGroups
      .filter((mg) => mg.isPrimary)
      .map((mg) => mg.muscleGroup.toLowerCase().replace("_", " "));

    const secondaryMuscles = exercise.muscleGroups
      .filter((mg) => !mg.isPrimary)
      .map((mg) => mg.muscleGroup.toLowerCase().replace("_", " "));

    const equipment = exercise.equipmentNeeded
      .map((e) => e.equipment.toLowerCase().replace("_", " "))
      .filter((e) => e !== "bodyweight");

    const instructionsSummary =
      exercise.instructions.length > 0
        ? exercise.instructions.slice(0, 4).join(" ")
        : "No specific instructions available.";

    const prompt = [
      `Exercise: ${exercise.name}`,
      `Category: ${exercise.category.toLowerCase()}`,
      `Difficulty: ${exercise.difficulty.toLowerCase()}`,
      `Primary muscles: ${primaryMuscles.join(", ") || "full body"}`,
      secondaryMuscles.length > 0
        ? `Secondary muscles: ${secondaryMuscles.join(", ")}`
        : null,
      equipment.length > 0
        ? `Equipment: ${equipment.join(", ")}`
        : "Equipment: bodyweight only",
      `Instructions: ${instructionsSummary}`,
      "",
      "Write a concise exercise description (2-3 sentences).",
      "- First sentence: what the exercise is and what muscles it targets.",
      "- Second sentence: how it's performed at a high level.",
      "- Optional third sentence: who benefits from this exercise or what makes it effective.",
      "- Do NOT mention ExerciseDB or any data source.",
      "- Write in a professional fitness encyclopedia tone.",
      "",
      'Respond with JSON only: {"description":"your 2-3 sentence description"}',
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model ?? this.ollamaChatModel,
          stream: false,
          format: "json",
          messages: [
            {
              role: "system",
              content:
                "You are a certified personal trainer writing an exercise encyclopedia. Output strict JSON only.",
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
      return this.parseDescription(data);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseDescription(response: OllamaChatResponse): string | null {
    const content = response.message?.content;
    if (!content) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    if (typeof parsed !== "object" || parsed === null) return null;

    const description = (parsed as { description?: unknown }).description;
    if (typeof description !== "string" || description.trim().length < 20)
      return null;

    // Reject if the AI still mentions ExerciseDB
    if (description.toLowerCase().includes("exercisedb")) return null;

    return description.trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async setMetric(value: Record<string, unknown>): Promise<void> {
    await this.db.platformSetting.upsert({
      where: { key: METRIC_KEY },
      create: {
        key: METRIC_KEY,
        value: JSON.stringify(value),
        updatedBy: "worker:exercise-descriptions",
      },
      update: {
        value: JSON.stringify(value),
        updatedBy: "worker:exercise-descriptions",
      },
    });
  }
}
