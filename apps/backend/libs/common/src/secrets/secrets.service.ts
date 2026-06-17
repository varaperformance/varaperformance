import { Injectable, Logger } from '@nestjs/common';

/**
 * Secrets service that reads from process.env.
 *
 * Secrets are loaded into process.env by the bootstrap loader (src/bootstrap.ts)
 * BEFORE NestJS initializes. This service provides a clean abstraction layer.
 *
 * Flow:
 * 1. main.ts calls loadInfisicalSecrets() -> secrets loaded into process.env
 * 2. NestJS app creates
 * 3. SecretsService reads from process.env (already populated)
 */
@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  /**
   * Get a secret value by key.
   */
  get(key: string): string | undefined {
    return process.env[key];
  }

  /**
   * Get a required secret value - throws if not found.
   */
  getOrThrow(key: string): string {
    const value = this.get(key);
    if (!value) {
      throw new Error(`Required secret "${key}" not found`);
    }
    return value;
  }

  /**
   * Check if Infisical was configured (bootstrap loaded secrets).
   */
  isUsingInfisical(): boolean {
    return !!(
      process.env.INFISICAL_CLIENT_ID &&
      process.env.INFISICAL_CLIENT_SECRET &&
      process.env.INFISICAL_PROJECT_ID
    );
  }
}
