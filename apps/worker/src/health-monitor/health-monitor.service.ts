import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom, timeout, catchError } from "rxjs";
import { of } from "rxjs";
import { DatabaseService } from "@app/database";

interface HealthCheckResult {
  status: "ok" | "error";
  info?: Record<string, { status: string; [key: string]: unknown }>;
  error?: Record<string, { status: string; [key: string]: unknown }>;
  details?: Record<string, { status: string; [key: string]: unknown }>;
}

interface ServiceCheck {
  name: string;
  endpoint: string;
  description: string;
}

interface DirectServiceCheck {
  name: string;
  description: string;
}

const SERVICE_CHECKS: ServiceCheck[] = [
  {
    name: "API",
    endpoint: "/health",
    description: "Core application services",
  },
  {
    name: "Database",
    endpoint: "/health/database",
    description: "Primary data storage",
  },
  {
    name: "Cache",
    endpoint: "/health/redis",
    description: "Session and data caching",
  },
  {
    name: "Message Queue",
    endpoint: "/health/rabbitmq",
    description: "Background task processing",
  },
  {
    name: "Payments",
    endpoint: "/health/stripe",
    description: "Payment processing",
  },
];

const DIRECT_CHECKS: DirectServiceCheck[] = [
  {
    name: "AI",
    description: "AI-powered features",
  },
];

/** Migrations from old service names to new generic names. */
const SERVICE_RENAMES: Record<string, string> = {
  Redis: "Cache",
  RabbitMQ: "Message Queue",
  Stripe: "Payments",
};

type ServiceStatus = "OPERATIONAL" | "DEGRADED" | "OUTAGE" | "MAINTENANCE";

@Injectable()
export class HealthMonitorService implements OnModuleInit {
  private readonly logger = new Logger(HealthMonitorService.name);
  private readonly backendUrl: string;
  private readonly ollamaBaseUrl: string;
  private readonly healthCheckTimeoutMs: number;
  private previousStatuses: Map<string, ServiceStatus> = new Map();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {
    this.backendUrl =
      this.configService.get<string>("BACKEND_URL") ?? "http://localhost:3000";
    this.ollamaBaseUrl =
      this.configService.get<string>("OLLAMA_BASE_URL") ??
      "http://localhost:11434";
    this.healthCheckTimeoutMs = Number(
      this.configService.get<string>("HEALTH_MONITOR_TIMEOUT_MS") ?? "10000",
    );
  }

  async onModuleInit() {
    this.logger.log("Health Monitor initializing...");
    try {
      // Ensure default services exist
      await this.ensureServicesExist();
      this.logger.log("Services created successfully");
      // Run initial check (don't fail init if health checks fail)
      await this.checkAllServices().catch((err) => {
        this.logger.warn(`Initial health check failed: ${err.message}`);
      });
      this.logger.log("Health Monitor initialized");
    } catch (error) {
      this.logger.error("Failed to initialize Health Monitor:", error);
    }
  }

  /**
   * Ensure all monitored services exist in the database
   */
  private async ensureServicesExist(): Promise<void> {
    // Migrate legacy service names to generic public-facing names.
    for (const [oldName, newName] of Object.entries(SERVICE_RENAMES)) {
      const legacy = await this.db.service.findFirst({
        where: { name: oldName },
      });
      if (legacy) {
        await this.db.service.update({
          where: { id: legacy.id },
          data: { name: newName },
        });
        this.logger.log(`Migrated service name: ${oldName} → ${newName}`);
      }
    }

    this.logger.log(
      `Syncing ${SERVICE_CHECKS.length + DIRECT_CHECKS.length} services...`,
    );
    const allChecks = [
      ...SERVICE_CHECKS.map((c, i) => ({
        name: c.name,
        description: c.description,
        order: i + 1,
      })),
      ...DIRECT_CHECKS.map((c, i) => ({
        name: c.name,
        description: c.description,
        order: SERVICE_CHECKS.length + i + 1,
      })),
    ];
    for (const check of allChecks) {
      this.logger.debug(`Checking service: ${check.name}`);
      const existing = await this.db.service.findFirst({
        where: { name: check.name },
      });

      if (!existing) {
        await this.db.service.create({
          data: {
            name: check.name,
            description: check.description,
            status: "OPERATIONAL",
            uptime: 100,
            order: check.order,
          },
        });
        this.logger.log(`Created service: ${check.name}`);
      } else if (existing.description !== check.description) {
        await this.db.service.update({
          where: { id: existing.id },
          data: { description: check.description },
        });
        this.logger.log(`Updated description for: ${check.name}`);
      }
    }
  }

  /**
   * Run health checks every 60 seconds
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAllServices(): Promise<void> {
    this.logger.debug("Running health checks...");

    for (const check of SERVICE_CHECKS) {
      await this.checkService(check);
    }

    for (const check of DIRECT_CHECKS) {
      await this.checkDirectService(check);
    }

    this.logger.debug("Health checks completed");
  }

  /**
   * Check a single service's health
   */
  private async checkService(check: ServiceCheck): Promise<void> {
    const url = `${this.backendUrl}${check.endpoint}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<HealthCheckResult>(url).pipe(
          timeout(this.healthCheckTimeoutMs),
          catchError((error) => {
            return of({
              data: {
                status: "error" as const,
                error: {
                  [check.name.toLowerCase()]: {
                    status: "down",
                    error: error.message,
                  },
                },
              },
              status: 503,
            });
          }),
        ),
      );

      const isHealthy = response.data.status === "ok";
      const newStatus: ServiceStatus = isHealthy ? "OPERATIONAL" : "OUTAGE";

      this.logger.debug(
        `${check.name}: response.status=${response.status}, data.status=${response.data.status}, isHealthy=${isHealthy}, newStatus=${newStatus}`,
      );

      await this.updateServiceStatus(check.name, newStatus);
    } catch (error) {
      this.logger.error(`Health check failed for ${check.name}:`, error);
      await this.updateServiceStatus(check.name, "OUTAGE");
    }
  }

  /**
   * Check Ollama / AI service directly from the worker
   */
  private async checkDirectService(check: DirectServiceCheck): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.healthCheckTimeoutMs,
      );

      try {
        const res = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
          signal: controller.signal,
        });

        const newStatus: ServiceStatus = res.ok ? "OPERATIONAL" : "OUTAGE";
        await this.updateServiceStatus(check.name, newStatus);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      this.logger.error(`Direct health check failed for ${check.name}:`, error);
      await this.updateServiceStatus(check.name, "OUTAGE");
    }
  }

  /**
   * Update service status in database and manage incidents
   */
  private async updateServiceStatus(
    serviceName: string,
    newStatus: ServiceStatus,
  ): Promise<void> {
    const service = await this.db.service.findFirst({
      where: { name: serviceName },
    });

    if (!service) {
      this.logger.warn(`Service not found: ${serviceName}`);
      return;
    }

    const previousStatus =
      this.previousStatuses.get(serviceName) ?? service.status;
    const statusChanged = previousStatus !== newStatus;

    // Update service status
    await this.db.service.update({
      where: { id: service.id },
      data: {
        status: newStatus,
        // Update uptime calculation (simplified - rolling average)
        uptime:
          newStatus === "OPERATIONAL"
            ? Math.min(100, service.uptime + 0.1)
            : Math.max(0, service.uptime - 1),
        updatedAt: new Date(),
      },
    });

    // Store current status for next comparison
    this.previousStatuses.set(serviceName, newStatus);

    // Handle status transitions
    if (statusChanged) {
      this.logger.log(
        `Service ${serviceName} status changed: ${previousStatus} -> ${newStatus}`,
      );

      if (newStatus === "OUTAGE" || newStatus === "DEGRADED") {
        // Create new incident
        await this.createIncident(serviceName, newStatus);
      } else if (
        newStatus === "OPERATIONAL" &&
        (previousStatus === "OUTAGE" || previousStatus === "DEGRADED")
      ) {
        // Resolve existing incidents
        await this.resolveIncidents(serviceName);
      }
    }
  }

  /**
   * Create an incident when a service goes down
   */
  private async createIncident(
    serviceName: string,
    status: ServiceStatus,
  ): Promise<void> {
    // Check if there's already an open incident for this service
    const existingIncident = await this.db.incident.findFirst({
      where: {
        title: { contains: serviceName },
        status: { not: "RESOLVED" },
      },
    });

    if (existingIncident) {
      // Add update to existing incident
      await this.db.incidentUpdate.create({
        data: {
          incidentId: existingIncident.id,
          message: `Service ${serviceName} is experiencing ${status === "OUTAGE" ? "an outage" : "degraded performance"}. Investigating...`,
        },
      });
      this.logger.log(`Updated existing incident for ${serviceName}`);
    } else {
      // Create new incident
      const incident = await this.db.incident.create({
        data: {
          title: `${serviceName} ${status === "OUTAGE" ? "Outage" : "Degraded Performance"}`,
          status: "INVESTIGATING",
        },
      });

      await this.db.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          message: `We are investigating issues with ${serviceName}. The service is currently ${status === "OUTAGE" ? "unavailable" : "experiencing degraded performance"}.`,
        },
      });

      this.logger.log(`Created incident for ${serviceName}: ${incident.id}`);
    }
  }

  /**
   * Resolve incidents when a service recovers
   */
  private async resolveIncidents(serviceName: string): Promise<void> {
    const openIncidents = await this.db.incident.findMany({
      where: {
        title: { contains: serviceName },
        status: { not: "RESOLVED" },
      },
    });

    for (const incident of openIncidents) {
      await this.db.incident.update({
        where: { id: incident.id },
        data: { status: "RESOLVED" },
      });

      await this.db.incidentUpdate.create({
        data: {
          incidentId: incident.id,
          message: `${serviceName} has recovered and is now operational.`,
        },
      });

      this.logger.log(`Resolved incident for ${serviceName}: ${incident.id}`);
    }
  }
}
