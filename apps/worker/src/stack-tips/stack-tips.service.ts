import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { DatabaseService } from "@app/database";
import type { StackTip } from "@varaperformance/core";

interface StackItemSummary {
  name: string;
  dosage: string;
  timeSlot: "MORNING" | "AFTERNOON" | "EVENING" | null;
  notes: string | null;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

const SLOT_ORDER: Array<"MORNING" | "AFTERNOON" | "EVENING"> = [
  "MORNING",
  "AFTERNOON",
  "EVENING",
];

const STACK_TIPS_JOB_METRIC_KEY = "worker.stackTips.lastRun";
const STACK_TIPS_JOB_UPDATED_KEY = "worker.stackTips.lastUpdatedCount";
const STACK_TIPS_JOB_ERROR_KEY = "worker.stackTips.lastError";
const STACK_TIPS_LOCK_KEY = 1_904_023;

@Injectable()
export class StackTipsService implements OnModuleInit {
  private readonly logger = new Logger(StackTipsService.name);
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
      this.configService.get<string>("AI_STACK_TIPS_TIMEOUT_MS") ?? "60000",
    );
  }

  onModuleInit(): void {
    this.logger.log("Stack tips service initialized");
    // Run once shortly after startup so metrics appear without waiting 15 minutes.
    setTimeout(() => {
      this.refreshActiveStackTips().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Initial stack tip refresh failed: ${message}`);
      });
    }, 5000);
  }

  @Cron("0 */15 * * * *")
  async refreshActiveStackTips(): Promise<void> {
    const lockRows = await this.db.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(${STACK_TIPS_LOCK_KEY}) AS acquired
    `;
    const acquired = lockRows[0]?.acquired === true;

    if (!acquired) {
      this.logger.debug(
        "Skipping stack tip refresh because another scheduler instance holds the lock",
      );
      return;
    }

    if (this.isProcessing) {
      this.logger.log("Stack tip refresh already in progress, skipping...");
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${STACK_TIPS_LOCK_KEY})
      `;
      return;
    }

    this.isProcessing = true;
    const startedAt = Date.now();
    await this.setMetric(
      STACK_TIPS_JOB_METRIC_KEY,
      JSON.stringify({
        status: "running",
        startedAt: new Date(startedAt).toISOString(),
      }),
    );

    try {
      const activeStacks = await this.db.stack.findMany({
        where: {
          isActive: true,
          user: {
            profile: {
              is: {
                allowedAI: true,
                deletedAt: null,
              },
            },
          },
        },
        select: {
          id: true,
          userId: true,
          name: true,
          tips: true,
          items: {
            select: {
              name: true,
              dosage: true,
              timeSlot: true,
              notes: true,
            },
          },
        },
      });

      if (activeStacks.length === 0) {
        this.logger.log("No active stacks found for AI-enabled profiles.");
        await this.setMetric(
          STACK_TIPS_JOB_METRIC_KEY,
          JSON.stringify({
            status: "success",
            startedAt: new Date(startedAt).toISOString(),
            finishedAt: new Date().toISOString(),
            durationMs: Date.now() - startedAt,
            updatedCount: 0,
            totalCandidates: 0,
          }),
        );
        await this.setMetric(STACK_TIPS_JOB_UPDATED_KEY, "0");
        return;
      }

      this.logger.log(
        `Found ${activeStacks.length} active stacks for AI-enabled profiles.`,
      );

      let updatedCount = 0;

      for (const stack of activeStacks) {
        const generatedTips = await this.generateTipsForStack(
          stack.name,
          stack.items,
        );

        if (!generatedTips) continue;

        const currentTipsJson = JSON.stringify(stack.tips ?? null);
        const generatedTipsJson = JSON.stringify(generatedTips);

        if (currentTipsJson === generatedTipsJson) {
          continue;
        }

        await this.db.stack.update({
          where: { id: stack.id },
          data: { tips: generatedTips as unknown as object },
        });
        updatedCount += 1;
      }

      const durationMs = Date.now() - startedAt;
      await this.setMetric(
        STACK_TIPS_JOB_METRIC_KEY,
        JSON.stringify({
          status: "success",
          startedAt: new Date(startedAt).toISOString(),
          finishedAt: new Date().toISOString(),
          durationMs,
          updatedCount: updatedCount,
          totalCandidates: activeStacks.length,
        }),
      );
      await this.setMetric(STACK_TIPS_JOB_UPDATED_KEY, String(updatedCount));
      this.logger.log(
        `Stack tip refresh complete: ${updatedCount}/${activeStacks.length} stacks updated in ${durationMs}ms.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.setMetric(
        STACK_TIPS_JOB_METRIC_KEY,
        JSON.stringify({
          status: "error",
          startedAt: new Date(startedAt).toISOString(),
          failedAt: new Date().toISOString(),
          message,
        }),
      );
      await this.setMetric(STACK_TIPS_JOB_ERROR_KEY, message);
      this.logger.error(`Stack tip refresh failed: ${message}`);
    } finally {
      this.isProcessing = false;
      await this.db.$queryRaw`
        SELECT pg_advisory_unlock(${STACK_TIPS_LOCK_KEY})
      `;
    }
  }

  private async setMetric(key: string, value: string): Promise<void> {
    await this.db.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value,
        updatedBy: "worker:stack-tips",
      },
      update: {
        value,
        updatedBy: "worker:stack-tips",
      },
    });
  }

  private async generateTipsForStack(
    stackName: string,
    items: StackItemSummary[],
  ): Promise<StackTip[] | null> {
    if (!this.ollamaBaseUrl || !this.ollamaChatModel) {
      return null;
    }

    const populatedSlots = SLOT_ORDER.filter((slot) =>
      items.some((item) => item.timeSlot === slot),
    );

    if (populatedSlots.length === 0) return null;

    const tips: StackTip[] = [];

    for (const slot of populatedSlots) {
      try {
        const tip = await this.generateTipForSlot(stackName, slot, items);
        if (tip) tips.push(tip);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `AI tip generation failed for stack '${stackName}' [${slot}]: ${message}`,
        );
      }
    }

    this.logger.log(
      `Stack '${stackName}': generated ${tips.length}/${populatedSlots.length} tips`,
    );

    return tips.length > 0 ? tips : null;
  }

  private async generateTipForSlot(
    stackName: string,
    slot: (typeof SLOT_ORDER)[number],
    items: StackItemSummary[],
  ): Promise<StackTip | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.ollamaTimeoutMs,
    );

    const slotItems = items.filter((item) => item.timeSlot === slot);
    const supplementList = slotItems
      .map((i) => {
        let entry = `${i.name} ${i.dosage}`;
        if (i.notes) entry += ` — ${i.notes}`;
        return entry;
      })
      .join("\n  - ");

    const slotLabel = slot.toLowerCase();
    const prompt = [
      `Time of day: ${slotLabel}`,
      `Supplements being taken:`,
      `  - ${supplementList}`,
      "",
      `Write ONE specific tip (1–2 sentences) about how to properly take these exact supplements during the ${slotLabel}.`,
      "",
      "Rules:",
      "- Name each supplement in your tip.",
      "- Say whether to take with food, on an empty stomach, or with water.",
      "- Mention any real interactions between the supplements listed.",
      '- Include a specific timing cue (e.g. "20 min before training", "with your first meal").',
      "- Do NOT reference anything outside the supplements listed above.",
      "- Do NOT give generic motivational advice.",
      "",
      'Respond with JSON only: {"title":"2-4 word label","content":"the tip"}',
    ].join("\n");

    try {
      const res = await fetch(`${this.ollamaBaseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.ollamaChatModel,
          stream: false,
          format: "json",
          messages: [
            {
              role: "system",
              content:
                "You are an expert sports nutritionist. Give blunt, specific supplement advice. Output strict JSON only.",
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
      return this.parseSingleTip(slot, data);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseSingleTip(
    slot: (typeof SLOT_ORDER)[number],
    response: OllamaChatResponse,
  ): StackTip | null {
    const content = response.message?.content;
    if (!content) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return null;
    }

    if (typeof parsed !== "object" || parsed === null) return null;

    const title = (parsed as { title?: unknown }).title;
    const contentText = (parsed as { content?: unknown }).content;

    if (typeof title !== "string" || title.trim().length === 0) return null;
    if (typeof contentText !== "string" || contentText.trim().length === 0)
      return null;

    return {
      timeSlot: slot,
      title: title.trim().slice(0, 60),
      content: contentText.trim().slice(0, 220),
    };
  }
}
