import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MediaRepository } from './media.repository.js';
import { MediaThumbnailEnqueuer } from './media-thumbnail.helper.js';
import { StorageService } from '../storage/storage.service.js';
import {
  NotFoundError,
  UploadFailedError,
} from '../../common/errors/errors.js';

export type MediaType = 'photo' | 'video';

export type UploadItemInput = {
  type: MediaType;
  contentType: string;
};

export type FinalizeItemInput = {
  mediaId: string;
  width?: number | null;
  height?: number | null;
  durationSec?: number | null;
  sizeBytes?: number | null;
};

export type Uploader = { kind: 'guest' } | { kind: 'owner'; userId: string };

@Injectable()
export class MediaUploadService {
  constructor(
    private readonly repo: MediaRepository,
    private readonly storage: StorageService,
    private readonly thumbnails: MediaThumbnailEnqueuer,
  ) {}

  async generateUploadUrls(params: {
    eventId: string;
    items: UploadItemInput[];
    uploader: Uploader;
  }) {
    const uploadTargets = await Promise.all(
      params.items.map((item) =>
        this.presignAndPersist({
          eventId: params.eventId,
          item,
          uploader: params.uploader,
        }),
      ),
    );
    return { uploadTargets };
  }

  async finalizeOwnerUploads(
    eventId: string,
    userId: string,
    items: FinalizeItemInput[],
  ) {
    const rows = await this.repo.findManyByIds(items.map((i) => i.mediaId));
    const byId = new Map(rows.map((r) => [r.id, r]));

    for (const item of items) {
      const row = byId.get(item.mediaId);
      if (!row) throw new NotFoundError('Media', item.mediaId);
      this.assertOwnerRow(row, eventId, userId, item.mediaId);
      await this.verifyAndUpdateMedia(row, item);
    }
    return { finalized: items.length };
  }

  async attachGuestMediaToMessage(params: {
    mediaIds: string[];
    eventId: string;
    messageId: string;
  }) {
    if (params.mediaIds.length === 0) return [];
    const rows = await this.repo.findManyByIds(params.mediaIds);
    if (rows.length !== params.mediaIds.length) {
      throw new NotFoundError('Media');
    }
    for (const row of rows) {
      this.assertGuestRow(row, params.eventId);
      const head = await this.storage.verifyUploaded(row.s3Key);
      if (!head) throw new UploadFailedError(row.s3Key);
    }
    await this.repo.attachToMessage(params.mediaIds, params.messageId);
    for (const row of rows) {
      await this.thumbnails.enqueue(row);
    }
    return rows;
  }

  private async presignAndPersist(params: {
    eventId: string;
    item: UploadItemInput;
    uploader: Uploader;
  }) {
    const mediaId = randomUUID();
    const presigned = await this.storage.presignMediaUpload({
      eventId: params.eventId,
      mediaId,
      type: params.item.type,
      contentType: params.item.contentType,
    });
    await this.repo.create({
      id: mediaId,
      eventId: params.eventId,
      messageId: null,
      uploaderType: params.uploader.kind,
      uploaderUserId:
        params.uploader.kind === 'owner' ? params.uploader.userId : null,
      type: params.item.type,
      s3Key: presigned.key,
      mimeType: params.item.contentType.split(';')[0].trim().toLowerCase(),
    });
    return {
      mediaId,
      type: params.item.type,
      key: presigned.key,
      url: presigned.url,
      headers: presigned.headers,
      maxSizeBytes: presigned.maxSizeBytes,
      expiresAt: presigned.expiresAt.toISOString(),
    };
  }

  private assertOwnerRow(
    row: {
      id: string;
      type: string;
      s3Key: string;
      eventId: string;
      uploaderType: string;
      uploaderUserId: string | null;
    },
    eventId: string,
    userId: string,
    mediaId: string,
  ): void {
    if (
      row.eventId !== eventId ||
      row.uploaderType !== 'owner' ||
      row.uploaderUserId !== userId
    ) {
      throw new NotFoundError('Media', mediaId);
    }
  }

  private async verifyAndUpdateMedia(
    row: { id: string; type: string; s3Key: string },
    item: FinalizeItemInput,
  ): Promise<void> {
    const head = await this.storage.verifyUploaded(row.s3Key);
    if (!head) throw new UploadFailedError(row.s3Key);
    await this.repo.update(item.mediaId, {
      width: item.width ?? null,
      height: item.height ?? null,
      durationSec: item.durationSec ?? null,
      sizeBytes: item.sizeBytes ?? head.size,
    });
    await this.thumbnails.enqueue(row);
  }

  private assertGuestRow(
    row: {
      id: string;
      eventId: string;
      uploaderType: string;
      messageId: string | null;
    },
    eventId: string,
  ): void {
    if (
      row.eventId !== eventId ||
      row.uploaderType !== 'guest' ||
      row.messageId !== null
    ) {
      throw new NotFoundError('Media', row.id);
    }
  }
}
