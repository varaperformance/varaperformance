import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ErrorResponse } from '@varaperformance/core';
import type { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: Record<string, unknown> | undefined;
    let validationErrors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        // class-validator ValidationPipe: message is array of strings or array of ValidationError objects
        if (Array.isArray(res.message)) {
          message = 'Validation failed';
          validationErrors = res.message.map((err) => {
            if (typeof err === 'string') return err;
            // class-validator ValidationError object
            if (
              typeof err === 'object' &&
              err.property &&
              err.constraints &&
              typeof err.constraints === 'object'
            ) {
              return Object.values(err.constraints)
                .map((msg: string) => `${err.property}: ${msg}`)
                .join('; ');
            }
            // Zod-like error object
            if (
              typeof err === 'object' &&
              Array.isArray(err.path) &&
              err.message
            ) {
              const path = err.path.join('.') || 'value';
              return `${path}: ${err.message}`;
            }
            return JSON.stringify(err);
          });
        } else {
          message = (res.message as string) || exception.message;
        }
        // If errors/details are present and are array of objects, convert to string array
        if (Array.isArray(res.errors)) {
          message = 'Validation failed';
          validationErrors = res.errors.map((err) => {
            if (typeof err === 'string') return err;
            if (
              typeof err === 'object' &&
              err.property &&
              err.constraints &&
              typeof err.constraints === 'object'
            ) {
              return Object.values(err.constraints)
                .map((msg: string) => `${err.property}: ${msg}`)
                .join('; ');
            }
            if (
              typeof err === 'object' &&
              Array.isArray(err.path) &&
              err.message
            ) {
              const path = err.path.join('.') || 'value';
              return `${path}: ${err.message}`;
            }
            return JSON.stringify(err);
          });
        }
        if (Array.isArray(res.details)) {
          message = 'Validation failed';
          validationErrors = res.details.map((err) => {
            if (typeof err === 'string') return err;
            if (
              typeof err === 'object' &&
              err.property &&
              err.constraints &&
              typeof err.constraints === 'object'
            ) {
              return Object.values(err.constraints)
                .map((msg: string) => `${err.property}: ${msg}`)
                .join('; ');
            }
            if (
              typeof err === 'object' &&
              Array.isArray(err.path) &&
              err.message
            ) {
              const path = err.path.join('.') || 'value';
              return `${path}: ${err.message}`;
            }
            return JSON.stringify(err);
          });
        }
      }
      code = this.getErrorCode(status);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Always return validation errors as array of strings (class-validator style)
    let errorResponse: ErrorResponse;
    if (validationErrors) {
      errorResponse = {
        success: false,
        error: {
          code,
          message,
          details: { errors: validationErrors },
        },
      };
    } else {
      errorResponse = {
        success: false,
        error: {
          code,
          message,
          ...(details && { details }),
        },
      };
    }
    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
    };
    return codeMap[status] || 'UNKNOWN_ERROR';
  }
}
