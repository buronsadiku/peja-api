import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { getEnv } from '../../config/env.js';

interface SentryModule {
  init(options: {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
  }): void;
  captureException(
    error: Error,
    context?: { extra?: Record<string, unknown> },
  ): void;
}

@Injectable()
export class ObservabilityService implements OnModuleInit {
  private readonly logger = new Logger('ObservabilityService');
  private sentry: SentryModule | null = null;

  onModuleInit() {
    const env = getEnv();
    if (env.SENTRY_DSN) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.sentry = require('@sentry/nestjs') as SentryModule;
        this.sentry.init({
          dsn: env.SENTRY_DSN,
          environment: env.SENTRY_ENV || env.NODE_ENV,
          tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
        });
        this.logger.log('Sentry initialized');
      } catch {
        this.logger.warn('Sentry not available — error tracking disabled');
      }
    } else {
      this.logger.warn('SENTRY_DSN not set — error tracking disabled');
    }
  }

  captureException(error: Error, context?: Record<string, unknown>) {
    if (this.sentry) {
      this.sentry.captureException(error, { extra: context });
    }
    this.logger.error({ ...context }, error.message);
  }
}
