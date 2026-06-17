import { registerAs } from '@nestjs/config';

export default registerAs('strava', () => ({
  clientId: process.env.STRAVA_CLIENT_ID ?? '',
  clientSecret: process.env.STRAVA_CLIENT_SECRET ?? '',
  redirectUri:
    process.env.STRAVA_REDIRECT_URI ??
    'http://localhost:3000/v1/integrations/strava/callback',
  webRedirectUrl:
    process.env.STRAVA_WEB_REDIRECT_URL ?? 'http://localhost:5173/integrations',
  scopes: process.env.STRAVA_SCOPES ?? 'read,activity:read_all',
  stateTtlMs: Number(process.env.STRAVA_STATE_TTL_MS ?? 10 * 60 * 1000),
}));
