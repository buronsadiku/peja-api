import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { AppError } from './app.error.js';
import { t } from '../i18n/t.js';
import { SUPPORTED_LANGUAGES } from '../constants.js';
import type { SupportedLanguage } from '../constants.js';
import type { PejaRequest } from '../types/request.js';

interface HttpExceptionResponse {
  message?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<PejaRequest>();
    const locale = this.getLocale(request);

    if (exception instanceof AppError) {
      const message = exception.i18nKey
        ? t(exception.i18nKey, locale, exception.i18nParams)
        : exception.message;

      const body = {
        error: {
          code: exception.code,
          message,
          details: exception.details ?? {},
        },
      };

      if (
        exception.code === 'RATE_LIMITED' &&
        exception.details?.retryAfterSec
      ) {
        response.setHeader(
          'Retry-After',
          String(Number(exception.details.retryAfterSec)),
        );
      }

      this.logger.warn(
        { code: exception.code, path: request.url, method: request.method },
        exception.message,
      );
      return response.status(exception.httpStatus).json(body);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exResponse = exception.getResponse();
      return response.status(status).json({
        error: {
          code: 'HTTP_ERROR',
          message:
            typeof exResponse === 'string'
              ? exResponse
              : (exResponse as HttpExceptionResponse).message || 'Error',
          details: {},
        },
      });
    }

    const traceId = request.traceId || randomUUID();
    this.logger.error(
      {
        traceId,
        path: request.url,
        method: request.method,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      exception instanceof Error ? exception.message : 'Unknown error',
    );

    return response.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: t('errors:internal_error', locale),
        details: { traceId },
      },
    });
  }

  private getLocale(request: PejaRequest): SupportedLanguage {
    // User preference first
    const userLang = request.currentUser?.preferredLanguage as
      | string
      | undefined;
    if (
      userLang &&
      SUPPORTED_LANGUAGES.includes(userLang as SupportedLanguage)
    ) {
      return userLang as SupportedLanguage;
    }

    // Accept-Language header
    const acceptLang = request.headers['accept-language'];
    if (acceptLang) {
      const preferred = acceptLang
        .split(',')
        .map((part) => part.split(';')[0].trim().substring(0, 2).toLowerCase())
        .find((code) =>
          SUPPORTED_LANGUAGES.includes(code as SupportedLanguage),
        );
      if (preferred) {
        return preferred as SupportedLanguage;
      }
    }

    return 'en';
  }
}
