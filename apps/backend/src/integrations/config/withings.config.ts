import { registerAs } from '@nestjs/config';

export default registerAs('withings', () => ({
  clientId: process.env.WITHINGS_CLIENT_ID ?? '',
  clientSecret: process.env.WITHINGS_CLIENT_SECRET ?? '',
  redirectUri:
    process.env.WITHINGS_REDIRECT_URI ??
    'http://localhost:3000/v1/integrations/withings/callback',
  webRedirectUrl:
    process.env.WITHINGS_WEB_REDIRECT_URL ??
    'http://localhost:5173/integrations',
  /**
   * Comma- or space-separated in env; sent to authorize2 as comma-separated per Withings docs.
   * Default `user.metrics` covers Getmeas (weight/body). Add `user.info` only if your app allows it in the portal.
   * @see https://developer.withings.com/developer-guide/v3/integration-guide/public-health-data-api/get-access/oauth-authorization-url
   */
  scopes: process.env.WITHINGS_SCOPES ?? 'user.metrics',
  stateTtlMs: Number(process.env.WITHINGS_STATE_TTL_MS ?? 10 * 60 * 1000),
  /** How far back to pull measurements on sync (max window Withings allows per request) */
  historyDays: Number(process.env.WITHINGS_HISTORY_DAYS ?? 90),
}));
