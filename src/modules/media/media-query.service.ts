import { Injectable, Logger } from '@nestjs/common';
import { MediaRepository, MediaRow, GalleryRow } from './media.repository.js';
import { StorageService } from '../storage/storage.service.js';
import type { GalleryItem } from './media.types.js';

export type GalleryQuery = {
  type?: 'photo' | 'video';
  filter?: 'favorites' | 'gold_book';
  sort?: 'newest' | 'oldest';
  search?: string;
  cursor?: string;
  limit: number;
};

@Injectable()
export class MediaQueryService {
  private readonly logger = new Logger('MediaQueryService');

  constructor(
    private readonly repo: MediaRepository,
    private readonly storage: StorageService,
  ) {}

  async getGallery(
    eventId: string,
    opts: GalleryQuery,
  ): Promise<{ data: GalleryItem[]; nextCursor: string | null }> {
    const rows = await this.repo.findGalleryFeed(eventId, opts);
    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const nextCursor = hasMore
      ? slice[slice.length - 1].createdAt.toISOString()
      : null;

    const data = await Promise.all(slice.map((row) => this.toGalleryItem(row)));
    return { data, nextCursor };
  }

  async toGalleryItem(row: MediaRow | GalleryRow): Promise<GalleryItem> {
    let url: string | null = null;
    let thumbUrl: string | null = null;
    try {
      const [signedOriginal, signedThumb] = await Promise.all([
        this.storage.presignPlaybackUrl(row.s3Key),
        row.thumbKey
          ? this.storage.presignPlaybackUrl(row.thumbKey)
          : Promise.resolve<string | null>(null),
      ]);
      url = signedOriginal;
      thumbUrl = signedThumb;
    } catch (err) {
      this.logger.warn(
        { err: err as Error, mediaId: row.id },
        'Failed to presign media URL',
      );
    }
    return {
      id: row.id,
      type: row.type as 'photo' | 'video',
      uploaderType: row.uploaderType as 'guest' | 'owner',
      uploaderName: 'uploaderName' in row ? row.uploaderName : null,
      messageId: row.messageId,
      url,
      thumbUrl,
      width: row.width,
      height: row.height,
      durationSec: row.durationSec,
      isFavorite: row.isFavorite,
      isGoldBookSelected: row.isGoldBookSelected,
      createdAt: row.createdAt,
    };
  }

  async listForMessage(messageId: string): Promise<MediaRow[]> {
    return this.repo.findByMessageId(messageId);
  }

  async listForMessages(
    messageIds: string[],
  ): Promise<Record<string, MediaRow[]>> {
    return this.repo.findByMessageIds(messageIds);
  }
}
