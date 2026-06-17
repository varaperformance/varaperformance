import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ServerResponse } from 'http';

interface PinoRequest {
  id?: string;
  method?: string;
  url?: string;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'res.headers["set-cookie"]',
            'body.password',
            'body.token',
            'body.refreshToken',
          ],
          censor: '[REDACTED]',
        },
        serializers: {
          req: (req: PinoRequest) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
          }),
          res: (res: ServerResponse) => ({
            statusCode: res.statusCode,
          }),
        },
        customProps: () => ({
          context: 'HTTP',
        }),
        autoLogging: true,
        quietReqLogger: true,
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
