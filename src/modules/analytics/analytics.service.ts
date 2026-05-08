import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { getEnv } from '../../config/env.js';

interface PostHogClient {
  capture(params: {
    distinctId: string;
    event: string;
    properties: Record<string, unknown>;
  }): void;
  identify(params: {
    distinctId: string;
    properties: Record<string, unknown>;
  }): void;
  shutdown(): Promise<void>;
}

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger('AnalyticsService');
  private client: PostHogClient | null = null;

  constructor() {
    const env = getEnv();
    if (env.POSTHOG_API_KEY && env.POSTHOG_HOST) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PostHog } = require('posthog-node') as {
          PostHog: new (
            apiKey: string,
            opts: { host: string; flushAt: number; flushInterval: number },
          ) => PostHogClient;
        };
        this.client = new PostHog(env.POSTHOG_API_KEY, {
          host: env.POSTHOG_HOST,
          flushAt: 20,
          flushInterval: 10_000,
        });
        this.logger.log('PostHog analytics initialized');
      } catch {
        this.logger.warn('PostHog not available — analytics disabled');
      }
    } else {
      this.logger.warn('POSTHOG_API_KEY not set — analytics disabled');
    }
  }

  private capture(
    userId: string,
    event: string,
    properties: Record<string, unknown>,
  ) {
    if (!this.client) return;
    this.client.capture({
      distinctId: userId,
      event,
      properties: { ...properties, source: 'backend' },
    });
  }

  eventCreated(userId: string, props: { eventId: string }) {
    this.capture(userId, 'event_created', props);
  }

  messageSubmitted(
    userId: string | null,
    props: { eventId: string; type: string },
  ) {
    this.capture(userId ?? 'anon', 'guest_message_submitted', props);
  }

  paymentCompleted(
    userId: string,
    props: { amountCents: number; currency: string; planTier: string },
  ) {
    this.capture(userId, 'payment_completed', props);
  }

  identify(userId: string, properties: Record<string, unknown>) {
    if (!this.client) return;
    this.client.identify({ distinctId: userId, properties });
  }

  async onModuleDestroy() {
    if (this.client) await this.client.shutdown();
  }
}
