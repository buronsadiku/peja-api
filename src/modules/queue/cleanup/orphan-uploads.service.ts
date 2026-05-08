import { Injectable, Logger } from '@nestjs/common';
import { eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '../../../database/database.decorator.js';
import type { DrizzleDB } from '../../../database/database.types.js';
import { events, media } from '../../../database/schema/index.js';
import { StorageService } from '../../storage/storage.service.js';

@Injectable()
export class OrphanUploadsCleanupService {
  private readonly logger = new Logger('OrphanUploadsCleanup');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly storage: StorageService,
  ) {}

  async run(): Promise<void> {
    this.logger.log('Starting orphan upload cleanup');

    if (!this.storage.isEnabled()) {
      this.logger.warn('Storage not configured — skipping orphan cleanup');
      return;
    }

    const allEvents = await this.db
      .select({ id: events.id })
      .from(events)
      .where(isNull(events.deletedAt))
      .limit(50);

    let cleaned = 0;
    for (const event of allEvents) {
      const objects = await this.storage.listObjects(
        `events/${event.id}/media/`,
      );

      for (const obj of objects) {
        const filename = obj.key.split('/').pop() ?? '';
        const mediaId = filename.split('.')[0]?.replace(/-thumb$/, '');
        if (!mediaId) continue;

        const row = await this.db
          .select({ id: media.id })
          .from(media)
          .where(eq(media.id, mediaId))
          .limit(1);

        if (row.length === 0) {
          await this.storage.deleteObject(obj.key);
          cleaned++;
        }
      }
    }

    this.logger.log({ cleaned }, 'Orphan upload cleanup complete');
  }
}
