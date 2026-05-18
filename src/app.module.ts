import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import type { IncomingMessage } from 'http';
import { DatabaseModule } from './database/database.module.js';
import { ActivitiesModule } from './modules/activities/activities.module.js';
import { RegistrationsModule } from './modules/registrations/registrations.module.js';
import { GalleryModule } from './modules/gallery/gallery.module.js';
import { NewsModule } from './modules/news/news.module.js';
import { SponsorsModule } from './modules/sponsors/sponsors.module.js';
import { EmailModule } from './modules/email/email.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { CommunitiesModule } from './modules/communities/communities.module.js';
import { MusiciansModule } from './modules/musicians/musicians.module.js';
import { HealthModule } from './modules/health/health.module.js';

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
    EmailModule,
    ActivitiesModule,
    RegistrationsModule,
    GalleryModule,
    NewsModule,
    SponsorsModule,
    CommunitiesModule,
    MusiciansModule,
    HealthModule,
    UploadsModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
  ],
})
export class AppModule {}
