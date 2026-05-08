import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { MediaRepository } from './media.repository.js';
import { StorageService } from '../storage/storage.service.js';

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

@Processor(QUEUE_NAMES.MEDIA)
export class MediaProcessor extends WorkerHost {
  private readonly logger = new Logger('MediaProcessor');

  constructor(
    private readonly mediaRepo: MediaRepository,
    private readonly storage: StorageService,
  ) {
    super();
  }

  async process(job: Job<{ mediaId: string }>): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.GENERATE_PHOTO_THUMBNAIL:
        return this.generateThumbnail(job.data.mediaId);
      case JOB_NAMES.GENERATE_VIDEO_THUMBNAIL:
        return this.generateVideoThumbnail(job.data.mediaId);
      case JOB_NAMES.CONVERT_HEIC_TO_JPEG:
        return this.convertHeicToJpeg(job.data.mediaId);
      default:
        this.logger.warn({ jobName: job.name }, 'Unknown job type');
    }
  }

  private async generateThumbnail(mediaId: string): Promise<void> {
    this.logger.log({ mediaId }, 'Generating thumbnail');
    const row = await this.mediaRepo.findById(mediaId);
    if (!row || row.type !== 'photo') return;

    const photoUrl = await this.storage.presignPlaybackUrl(row.s3Key);
    const response = await fetch(photoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const thumbnail = await sharp(buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 75 })
      .toBuffer();

    const thumbKey = row.s3Key.replace(/\.[^.]+$/, '-thumb.webp');
    await this.storage.uploadBuffer(thumbKey, thumbnail, 'image/webp');
    await this.mediaRepo.update(mediaId, { thumbKey });
    this.logger.log(
      { mediaId, thumbKey, size: thumbnail.length },
      'Thumbnail generated',
    );
  }

  private async generateVideoThumbnail(mediaId: string): Promise<void> {
    this.logger.log({ mediaId, ffmpegPath }, 'Generating video thumbnail');
    const row = await this.mediaRepo.findById(mediaId);
    if (!row || row.type !== 'video') return;

    const videoUrl = await this.storage.presignPlaybackUrl(row.s3Key);
    const ext = row.s3Key.split('.').pop() || 'mp4';
    const tmpVideo = join(tmpdir(), `vid-${randomUUID()}.${ext}`);
    const tmpFrame = join(tmpdir(), `frame-${randomUUID()}.jpg`);

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.writeFile(tmpVideo, buffer);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(tmpVideo)
          .outputOptions(['-frames:v 1', '-q:v 3', '-ss 00:00:00.5'])
          .output(tmpFrame)
          .on('end', () => resolve())
          .on('error', (err) => {
            this.logger.error({ err, mediaId }, 'ffmpeg failed');
            reject(err);
          })
          .run();
      });

      const frameBuffer = await fs.readFile(tmpFrame);
      const thumbnail = await sharp(frameBuffer)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 75 })
        .toBuffer();

      const thumbKey = row.s3Key.replace(/\.[^.]+$/, '-thumb.webp');
      await this.storage.uploadBuffer(thumbKey, thumbnail, 'image/webp');
      await this.mediaRepo.update(mediaId, { thumbKey });
      this.logger.log(
        { mediaId, thumbKey, size: thumbnail.length },
        'Video thumbnail generated',
      );
    } finally {
      await fs.unlink(tmpVideo).catch(() => {});
      await fs.unlink(tmpFrame).catch(() => {});
    }
  }

  private async convertHeicToJpeg(mediaId: string): Promise<void> {
    this.logger.log({ mediaId }, 'Converting HEIC to JPEG');
    const row = await this.mediaRepo.findById(mediaId);
    if (!row || !row.s3Key.endsWith('.heic')) return;

    const photoUrl = await this.storage.presignPlaybackUrl(row.s3Key);
    const response = await fetch(photoUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const jpeg = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();
    const jpegKey = row.s3Key.replace(/\.heic$/, '.jpg');

    await this.storage.uploadBuffer(jpegKey, jpeg, 'image/jpeg');
    await this.mediaRepo.update(mediaId, {
      s3Key: jpegKey,
      mimeType: 'image/jpeg',
    });
    this.logger.log(
      { mediaId, jpegKey, size: jpeg.length },
      'HEIC converted to JPEG',
    );
  }
}
