import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from './queue.constants.js';
import { ExpiredMediaCleanupService } from './cleanup/expired-media.service.js';
import { OrphanUploadsCleanupService } from './cleanup/orphan-uploads.service.js';
import { GdprDeletionService } from './cleanup/gdpr-deletion.service.js';

@Processor(QUEUE_NAMES.CLEANUP)
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger('CleanupProcessor');

  constructor(
    private readonly expiredMedia: ExpiredMediaCleanupService,
    private readonly orphanUploads: OrphanUploadsCleanupService,
    private readonly gdpr: GdprDeletionService,
  ) {
    super();
  }

  async process(job: Job<Record<string, unknown>>): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.CLEANUP_EXPIRED_MEDIA:
        return this.expiredMedia.run();
      case JOB_NAMES.CLEANUP_ORPHAN_UPLOADS:
        return this.orphanUploads.run();
      case JOB_NAMES.PROCESS_GDPR_DELETION:
        return this.gdpr.run((job.data as { userId: string }).userId);
      default:
        this.logger.warn({ jobName: job.name }, 'Unknown cleanup job');
    }
  }
}
