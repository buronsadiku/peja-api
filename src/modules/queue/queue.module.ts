import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getEnv } from '../../config/env.js';
import { QUEUE_NAMES } from './queue.constants.js';
import { CleanupProcessor } from './cleanup.processor.js';
import { ExpiredMediaCleanupService } from './cleanup/expired-media.service.js';
import { OrphanUploadsCleanupService } from './cleanup/orphan-uploads.service.js';
import { GdprDeletionService } from './cleanup/gdpr-deletion.service.js';
import { MessageMediaCleaner } from './cleanup/message-media-cleaner.js';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          // ioredis accepts the URL string directly — preserves user,
          // password, database, and TLS scheme without manual parsing.
          url: getEnv().REDIS_URL,
          // Railway's private network resolves to IPv6; family: 0 lets
          // the resolver pick whichever record exists. Local docker
          // (IPv4) also works under family: 0.
          family: 0,
          // BullMQ requires this for BLPOP to behave reliably; without
          // it, ioredis aborts blocking commands after N retries and
          // workers go silent.
          maxRetriesPerRequest: null,
          // Skip INFO probe on connect — managed Redis providers
          // sometimes restrict it and the probe hangs the connection.
          enableReadyCheck: false,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.TRANSCRIPTION },
      { name: QUEUE_NAMES.MEDIA },
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.RENDERING },
      { name: QUEUE_NAMES.FULFILLMENT },
      { name: QUEUE_NAMES.CLEANUP },
    ),
  ],
  providers: [
    CleanupProcessor,
    ExpiredMediaCleanupService,
    OrphanUploadsCleanupService,
    GdprDeletionService,
    MessageMediaCleaner,
  ],
  exports: [BullModule],
})
export class QueueModule {}
