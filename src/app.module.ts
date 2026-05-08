import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'http';
import { DatabaseModule } from './database/database.module.js';
import { CacheModule } from './modules/cache/cache.module.js';
import { RateLimitModule } from './common/services/rate-limit.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { ObservabilityModule } from './modules/observability/observability.module.js';
import { StorageModule } from './modules/storage/storage.module.js';
import { QueueModule } from './modules/queue/queue.module.js';
import { MessagesModule } from './modules/messages/messages.module.js';
import { PublicModule } from './modules/public/public.module.js';
import { TranscriptionModule } from './modules/transcription/transcription.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { ThrottlerModule } from '@nestjs/throttler';
import { GlobalExceptionFilter } from './common/errors/exception.filter.js';
import { AuthGuard } from './common/guards/auth.guard.js';
import { FreshAuthGuard } from './common/guards/fresh-auth.guard.js';
import { PublicSubmissionGuard } from './common/guards/public-submission.guard.js';
import { TraceIdInterceptor } from './common/interceptors/trace-id.interceptor.js';
import { SerializeInterceptor } from './common/interceptors/serialize.interceptor.js';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware.js';
import { RawBodyMiddleware } from './common/middleware/raw-body.middleware.js';
import { WebhooksModule } from './modules/webhooks/webhooks.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { InvitationsModule } from './modules/invitations/invitations.module.js';
import { JobsModule } from './modules/jobs/jobs.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { KeepsakesModule } from './modules/keepsakes/keepsakes.module.js';
import { SchedulerModule } from './modules/scheduler/scheduler.module.js';
import { PlansModule } from './modules/plans/plans.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';
import { KioskSettingsModule } from './modules/kiosk-settings/kiosk-settings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        autoLogging: {
          ignore: (req: IncomingMessage) =>
            'url' in req && req.url === '/health',
        },
        redact: [
          'req.headers.authorization',
          '*.password',
          '*.apiKey',
          '*.secret',
        ],
      },
    }),
    DatabaseModule,
    CacheModule,
    RateLimitModule,
    HealthModule,
    AuthModule,
    UsersModule,
    EventsModule,
    SettingsModule,
    AnalyticsModule,
    ObservabilityModule,
    StorageModule,
    QueueModule,
    MessagesModule,
    PublicModule,
    TranscriptionModule,
    MediaModule,
    WebhooksModule,
    OrdersModule,
    PaymentsModule,
    InvitationsModule,
    JobsModule,
    EmailModule,
    AdminModule,
    KeepsakesModule,
    SchedulerModule,
    PlansModule,
    SubscriptionsModule,
    KioskSettingsModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: FreshAuthGuard },
    { provide: APP_GUARD, useClass: PublicSubmissionGuard },
    { provide: APP_INTERCEPTOR, useClass: TraceIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SerializeInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
    consumer.apply(RawBodyMiddleware).forRoutes('api/v1/webhooks');
  }
}
