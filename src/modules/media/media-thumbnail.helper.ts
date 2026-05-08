import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { jobOptions } from '../queue/queue.utils.js';

@Injectable()
export class MediaThumbnailEnqueuer {
  constructor(
    @InjectQueue(QUEUE_NAMES.MEDIA) private readonly mediaQueue: Queue,
  ) {}

  async enqueue(row: {
    id: string;
    type: string;
    s3Key: string;
  }): Promise<void> {
    if (row.type === 'photo') {
      await this.mediaQueue.add(
        JOB_NAMES.GENERATE_PHOTO_THUMBNAIL,
        { mediaId: row.id },
        jobOptions(),
      );
      if (row.s3Key.endsWith('.heic')) {
        await this.mediaQueue.add(
          JOB_NAMES.CONVERT_HEIC_TO_JPEG,
          { mediaId: row.id },
          jobOptions(),
        );
      }
    } else if (row.type === 'video') {
      await this.mediaQueue.add(
        JOB_NAMES.GENERATE_VIDEO_THUMBNAIL,
        { mediaId: row.id },
        jobOptions(),
      );
    }
  }
}
