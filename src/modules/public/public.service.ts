import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EventsRepository } from '../events/events.repository.js';
import { MessagesRepository } from '../messages/messages.repository.js';
import { MediaUploadService } from '../media/media-upload.service.js';
import { MediaQueryService } from '../media/media-query.service.js';
import { StorageService } from '../storage/storage.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { KioskSettingsService } from '../kiosk-settings/kiosk-settings.service.js';
import {
  NotFoundError,
  EventNotActiveError,
  EventExpiredError,
  MessageLimitReachedError,
  UploadFailedError,
} from '../../common/errors/errors.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { jobOptions } from '../queue/queue.utils.js';
import type { UploadUrlDto, CreateMessageDto } from './public.schemas.js';

@Injectable()
export class PublicService {
  private readonly logger = new Logger('PublicService');

  constructor(
    private readonly eventsRepo: EventsRepository,
    private readonly messagesRepo: MessagesRepository,
    private readonly mediaUpload: MediaUploadService,
    private readonly mediaQuery: MediaQueryService,
    private readonly storage: StorageService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly kioskSettingsService: KioskSettingsService,
    @InjectQueue(QUEUE_NAMES.TRANSCRIPTION)
    private readonly transcriptionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async getPublicEvent(slug: string) {
    const event = await this.eventsRepo.findBySlug(slug);
    if (!event) throw new NotFoundError('Event');

    const [messageCount, subscription, settings] = await Promise.all([
      this.messagesRepo.countByEvent(event.id),
      this.subscriptionsService.findActiveByEvent(event.id),
      this.kioskSettingsService.getOrCreateForEvent(event.id),
    ]);
    const limitReached =
      event.messageLimit !== null && messageCount >= event.messageLimit;
    const hasActiveSubscription = !!subscription;

    return {
      partnerAName: event.partnerAName,
      partnerBName: event.partnerBName,
      weddingDate: event.weddingDate,
      welcomeMessage: settings.welcomeNote ?? event.welcomeMessage,
      themeColor: event.themeColor,
      couplePhotoUrl: event.couplePhotoUrl,
      defaultLanguage: settings.defaultLanguage,
      supportedLanguages: settings.supportedLanguages,
      submissionOpen:
        hasActiveSubscription && event.status === 'active' && !limitReached,
      limitReached,
      kiosk: {
        captureAudio: settings.captureAudio,
        capturePhoto: settings.capturePhoto,
        captureVideo: settings.captureVideo,
        maxDurationSeconds: settings.maxDurationSeconds,
        returnAfterSeconds: settings.returnAfterSeconds,
        welcomeShowPhoto: settings.welcomeShowPhoto,
        welcomeShowLanguagePicker: settings.welcomeShowLanguagePicker,
        welcomeChime: settings.welcomeChime,
        fullscreenLock: settings.fullscreenLock,
        guidedMode: settings.guidedMode,
        exitPin: settings.exitPin,
      },
    };
  }

  async generateUploadUrls(slug: string, dto: UploadUrlDto) {
    const event = await this.getActiveEvent(slug);
    const audioTargets: Array<{
      kind: 'audio';
      key: string;
      url: string;
      headers: Record<string, string>;
      maxSizeBytes: number;
      expiresAt: string;
    }> = [];
    const mediaTargets: Array<{
      mediaId: string;
      type: 'photo' | 'video';
      key: string;
      url: string;
      headers?: Record<string, string>;
      maxSizeBytes: number;
      expiresAt: string;
    }> = [];

    if (dto.audioContentType) {
      const messageId = randomUUID();
      const target = await this.storage.presignAudioUpload(
        event.id,
        messageId,
        dto.audioContentType,
      );
      audioTargets.push({
        kind: 'audio' as const,
        key: target.key,
        url: target.url,
        headers: target.headers,
        maxSizeBytes: target.maxSizeBytes,
        expiresAt: target.expiresAt.toISOString(),
      });
    }

    if (dto.media && dto.media.length > 0) {
      const result = await this.mediaUpload.generateUploadUrls({
        eventId: event.id,
        items: dto.media,
        uploader: { kind: 'guest' },
      });
      mediaTargets.push(...result.uploadTargets);
    }

    return { audioTargets, mediaTargets };
  }

  async createMessage(
    slug: string,
    idempotencyKey: string,
    dto: CreateMessageDto,
  ) {
    const existing =
      await this.messagesRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { message: { id: existing.id, status: 'received' } };
    }

    const event = await this.getActiveEvent(slug);

    if (dto.audioKey) {
      const head = await this.storage.verifyUploaded(dto.audioKey);
      if (!head) throw new UploadFailedError(dto.audioKey);
    }

    const message = await this.messagesRepo.create({
      eventId: event.id,
      guestNames: dto.guestNames,
      audioKey: dto.audioKey ?? null,
      audioDurationSec: dto.audioDurationSec ?? null,
      audioMimeType: dto.audioMimeType ?? null,
      writtenNote: dto.writtenNote ?? null,
      submissionSource: dto.submissionSource,
      submissionLanguage: dto.submissionLanguage ?? null,
      clientCreatedAt: dto.clientCreatedAt
        ? new Date(dto.clientCreatedAt)
        : null,
      idempotencyKey,
      transcriptStatus: dto.audioKey ? 'pending' : 'skipped',
    });

    if (dto.mediaIds && dto.mediaIds.length > 0) {
      await this.mediaUpload.attachGuestMediaToMessage({
        mediaIds: dto.mediaIds,
        eventId: event.id,
        messageId: message.id,
      });
    }

    if (dto.audioKey) {
      await this.transcriptionQueue.add(
        JOB_NAMES.TRANSCRIBE_MESSAGE,
        { messageId: message.id },
        jobOptions(),
      );
    }

    await this.emailQueue.add(
      JOB_NAMES.SEND_NEW_MESSAGE_NOTIFICATION,
      { eventId: event.id, messageIds: [message.id] },
      jobOptions(),
    );

    this.logger.log(
      { messageId: message.id, eventId: event.id },
      'Message created',
    );
    return { message: { id: message.id, status: 'received' } };
  }

  async getPublicGallery(
    slug: string,
    opts: {
      type?: 'photo' | 'video';
      sort?: 'newest' | 'oldest';
      cursor?: string;
      limit: number;
    },
  ) {
    const event = await this.eventsRepo.findBySlug(slug);
    if (!event) throw new NotFoundError('Event');
    return this.mediaQuery.getGallery(event.id, opts);
  }

  private async getActiveEvent(slug: string) {
    const event = await this.eventsRepo.findBySlug(slug);
    if (!event) throw new NotFoundError('Event');

    const subscription = await this.subscriptionsService.findActiveByEvent(
      event.id,
    );
    if (!subscription) throw new EventNotActiveError();
    if (event.status !== 'active') throw new EventNotActiveError();

    if (event.storageExpiresAt && event.storageExpiresAt < new Date())
      throw new EventExpiredError();

    const messageCount = await this.messagesRepo.countByEvent(event.id);
    if (event.messageLimit !== null && messageCount >= event.messageLimit) {
      throw new MessageLimitReachedError();
    }

    return event;
  }
}
