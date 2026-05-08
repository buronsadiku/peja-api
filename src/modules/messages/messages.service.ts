import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MessagesRepository, MessageRow } from './messages.repository.js';
import { MediaRepository } from '../media/media.repository.js';
import { MediaQueryService } from '../media/media-query.service.js';
import { StorageService } from '../storage/storage.service.js';
import { NotFoundError } from '../../common/errors/errors.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { jobOptions } from '../queue/queue.utils.js';
import { toMessageSummary, toMessageDetail } from './messages.mapper.js';

@Injectable()
export class MessagesService {
  constructor(
    private readonly repo: MessagesRepository,
    private readonly mediaRepo: MediaRepository,
    private readonly mediaQuery: MediaQueryService,
    private readonly storage: StorageService,
    @InjectQueue(QUEUE_NAMES.TRANSCRIPTION)
    private readonly transcriptionQueue: Queue,
  ) {}

  async findByIdOrThrow(id: string): Promise<MessageRow> {
    const message = await this.repo.findById(id);
    if (!message || message.deletedAt) throw new NotFoundError('Message', id);
    return message;
  }

  async list(
    eventId: string,
    opts: {
      filter?: string;
      search?: string;
      sort?: string;
      cursor?: string;
      limit: number;
      includeOwnerUploads?: boolean;
    },
  ) {
    const rows = await this.repo.findByEvent(eventId, opts);
    const hasMore = rows.length > opts.limit;
    const data = hasMore ? rows.slice(0, opts.limit) : rows;
    const nextCursor = hasMore
      ? data[data.length - 1].createdAt.toISOString()
      : null;

    const mediaByMessage = await this.mediaRepo.findByMessageIds(
      data.map((m) => m.id),
    );

    const summaries = await Promise.all(
      data.map(async (msg) => {
        const mediaList = mediaByMessage[msg.id] ?? [];
        const photo = mediaList.find((m) => m.type === 'photo');
        const photoThumbUrl = photo ? await this.presignThumbnail(photo) : null;
        return toMessageSummary(msg, mediaList, photoThumbUrl);
      }),
    );

    return { data: summaries, nextCursor };
  }

  async getDetail(messageId: string) {
    const msg = await this.findByIdOrThrow(messageId);
    const [audioUrl, mediaItems] = await Promise.all([
      msg.audioKey ? this.storage.presignPlaybackUrl(msg.audioKey) : null,
      this.mediaRepo
        .findByMessageId(messageId)
        .then((rows) =>
          Promise.all(rows.map((row) => this.mediaQuery.toGalleryItem(row))),
        ),
    ]);
    return { message: toMessageDetail(msg, audioUrl, mediaItems) };
  }

  async update(
    messageId: string,
    data: {
      isFavorite?: boolean;
      isGoldBookSelected?: boolean;
      coupleNotes?: string | null;
      audioTrimStartSec?: number | null;
      audioTrimEndSec?: number | null;
      audioDurationSec?: number | null;
    },
  ) {
    await this.findByIdOrThrow(messageId);
    return this.repo.update(messageId, data);
  }

  async softDelete(messageId: string) {
    await this.findByIdOrThrow(messageId);
    return this.repo.softDelete(messageId);
  }

  async retranscribe(messageId: string, language?: string) {
    const msg = await this.findByIdOrThrow(messageId);
    if (!msg.audioKey)
      throw new NotFoundError('Message has no audio', messageId);
    await this.resetTranscriptState(messageId, language);
    const job = await this.enqueueTranscription(messageId);
    return { jobId: job.id };
  }

  private async presignThumbnail(photo: {
    thumbKey?: string | null;
    s3Key: string;
  }): Promise<string | null> {
    try {
      return await this.storage.presignPlaybackUrl(
        photo.thumbKey ?? photo.s3Key,
      );
    } catch {
      return null;
    }
  }

  private async resetTranscriptState(messageId: string, language?: string) {
    await this.repo.update(messageId, {
      transcriptStatus: 'pending',
      transcriptAttempts: 0,
      transcript: null,
      transcriptLanguage: language ?? null,
    });
  }

  private async enqueueTranscription(messageId: string) {
    return this.transcriptionQueue.add(
      JOB_NAMES.TRANSCRIBE_MESSAGE,
      { messageId },
      jobOptions(),
    );
  }
}
