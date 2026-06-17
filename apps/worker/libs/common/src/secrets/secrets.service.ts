import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  get(key: string): string | undefined {
    return process.env[key];
  }

  getOrThrow(key: string): string {
    const value = this.get(key);
    if (!value) {
      throw new Error(`Required secret "${key}" not found`);
    }
    return value;
  }

  isUsingInfisical(): boolean {
    return !!(
      process.env.INFISICAL_CLIENT_ID &&
      process.env.INFISICAL_CLIENT_SECRET &&
      process.env.INFISICAL_PROJECT_ID
    );
  }
}
