import { Module } from '@nestjs/common';
import { MediaProcessor } from './media.processor.js';
import { MediaRepository } from './media.repository.js';
import { MediaUploadService } from './media-upload.service.js';
import { MediaQueryService } from './media-query.service.js';
import { MediaCurationService } from './media-curation.service.js';
import { MediaThumbnailEnqueuer } from './media-thumbnail.helper.js';
import { MediaController } from './media.controller.js';
import { EventsModule } from '../events/events.module.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [EventsModule, QueueModule],
  controllers: [MediaController],
  providers: [
    MediaProcessor,
    MediaRepository,
    MediaThumbnailEnqueuer,
    MediaUploadService,
    MediaQueryService,
    MediaCurationService,
  ],
  exports: [
    MediaRepository,
    MediaUploadService,
    MediaQueryService,
    MediaCurationService,
  ],
})
export class MediaModule {}
