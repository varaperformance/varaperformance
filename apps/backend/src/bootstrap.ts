import { InfisicalSDK } from '@infisical/sdk';
import { Logger } from '@nestjs/common';

const logger = new Logger('Bootstrap');

/**
 * Bootstrap loader for Infisical secrets.
 * Must be called BEFORE NestJS app creation so DATABASE_URL is available.
 *
 * This loads all secrets from Infisical into process.env, allowing:
 * - DatabaseService to read DATABASE_URL in constructor
 * - SecretsService to provide runtime access with caching
 */
export async function loadInfisicalSecrets(): Promise<void> {
  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
  const projectId = process.env.INFISICAL_PROJECT_ID;
  const environment = process.env.INFISICAL_ENVIRONMENT || 'dev';
  const siteUrl = process.env.INFISICAL_SITE_URL;

  if (!clientId || !clientSecret || !projectId) {
    logger.warn('Infisical not configured - using environment variables');
    return;
  }

  try {
    const client = new InfisicalSDK({
      siteUrl: siteUrl || undefined,
    });

    await client.auth().universalAuth.login({
      clientId,
      clientSecret,
    });

    const secrets = await client.secrets().listSecrets({
      projectId,
      environment,
      secretPath: '/',
    });

    // Inject all secrets into process.env
    for (const secret of secrets.secrets) {
      process.env[secret.secretKey] = secret.secretValue;
    }

    logger.log(
      `Loaded ${secrets.secrets.length} secrets from Infisical (${environment})`,
    );
  } catch (error) {
    logger.error('Failed to load Infisical secrets', error as Error);
    throw new Error(
      'Failed to load secrets from Infisical. Check credentials.',
    );
  }
}
