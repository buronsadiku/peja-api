import { Injectable } from '@nestjs/common';
import { MediaRepository, MediaRow } from './media.repository.js';
import { NotFoundError } from '../../common/errors/errors.js';

@Injectable()
export class MediaCurationService {
  constructor(private readonly repo: MediaRepository) {}

  async updateFlags(
    eventId: string,
    mediaId: string,
    patch: { isFavorite?: boolean; isGoldBookSelected?: boolean },
  ): Promise<MediaRow> {
    const row = await this.repo.findById(mediaId);
    if (!row || row.eventId !== eventId || row.deletedAt) {
      throw new NotFoundError('Media', mediaId);
    }
    return this.repo.update(mediaId, patch);
  }

  async softDelete(eventId: string, mediaId: string): Promise<void> {
    const row = await this.repo.findById(mediaId);
    if (!row || row.eventId !== eventId || row.deletedAt) {
      throw new NotFoundError('Media', mediaId);
    }
    await this.repo.softDelete(mediaId);
  }
}
