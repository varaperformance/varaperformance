import 'dotenv/config';
import { loadInfisicalSecrets } from './bootstrap';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { GlobalExceptionFilter } from '@app/common/filters';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

function parseOrigins(origins: string | undefined): string[] {
  return (origins ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function shouldExposeSwagger(nodeEnv: string | undefined): boolean {
  return nodeEnv !== 'production';
}

async function bootstrap() {
  // Load secrets from Infisical BEFORE creating NestJS app
  await loadInfisicalSecrets();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true, // Required for payment webhook signature verification
  });

  // Raise the default 100 KB JSON body limit so large health-sync payloads
  // (e.g. 2 000 heart-rate samples per batch) are accepted.
  app.useBodyParser('json', { limit: '5mb' });

  // Enable Socket.IO WebSocket adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  const cspOrigins = parseOrigins(
    process.env.CSP_ORIGINS ??
      process.env.CORS_ORIGINS ??
      process.env.FRONTEND_URL,
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            'https://accounts.google.com',
            'https://apis.google.com',
            'https://www.googletagmanager.com',
            'https://js.stripe.com',
            'https://static.cloudflareinsights.com',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://accounts.google.com',
          ],
          imgSrc: [
            "'self'",
            'data:',
            'blob:',
            ...cspOrigins,
            'https://*.mapbox.com',
            'https://www.themealdb.com',
            'https://images.unsplash.com',
            'https://static.exercisedb.dev',
          ],
          fontSrc: ["'self'", 'data:'],
          connectSrc: [
            "'self'",
            ...cspOrigins,
            'https://accounts.google.com',
            'https://api.mapbox.com',
            'https://events.mapbox.com',
            'https://js.stripe.com',
            'https://cloudflareinsights.com',
            'wss:',
          ],
          frameSrc: [
            "'self'",
            'https://accounts.google.com',
            'https://js.stripe.com',
          ],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedded resources (avatars, uploads)
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow Capacitor WebView to load images
    }),
  );

  app.use(compression());
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new GlobalExceptionFilter());
  const corsOrigins = parseOrigins(
    process.env.CORS_ORIGINS ?? process.env.FRONTEND_URL,
  );
  if (corsOrigins.length === 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      'CORS_ORIGINS or FRONTEND_URL must be set in production to prevent open CORS',
    );
  }
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.set('trust proxy', 'loopback');
  app.use(cookieParser());

  if (shouldExposeSwagger(process.env.NODE_ENV)) {
    const config = new DocumentBuilder()
      .setTitle('Vara Performance API')
      .setDescription(
        'Backend API for Vara Performance platform. Includes identity management, blogs, notes, and status services.',
      )
      .setVersion('1.0.0')
      .setContact(
        'worlddrknss',
        'https://github.com/varaperformance/varaperformance',
        'https://github.com/varaperformance/varaperformance/issues',
      )
      .setLicense(
        'MIT',
        'https://github.com/varaperformance/varaperformance/blob/main/LICENSE.md',
      )
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
        'access-token',
      )
      .addTag('idm', 'Identity Management - Authentication & Authorization')
      .addTag('notes', 'Encrypted Notes - HIPAA compliant note storage')
      .addTag('blog', 'Blog Management - Posts, categories, and tags')
      .addTag('status', 'Status Page - Services and incidents')
      .build();
    const openApiDoc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, cleanupOpenApiDoc(openApiDoc));
  }

  const port = Number(process.env.APP_PORT ?? process.env.PORT ?? '3000');
  await app.listen(Number.isNaN(port) ? 3000 : port);
}
void bootstrap();
