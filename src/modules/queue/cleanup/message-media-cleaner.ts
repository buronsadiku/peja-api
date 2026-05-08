import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../../database/database.decorator.js';
import type { DrizzleDB } from '../../../database/database.types.js';
import { media } from '../../../database/schema/index.js';
import { StorageService } from '../../storage/storage.service.js';

@Injectable()
export class MessageMediaCleaner {
  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly storage: StorageService,
  ) {}

  async deleteForMessage(messageId: string): Promise<void> {
    const mediaRows = await this.db
      .select()
      .from(media)
      .where(eq(media.messageId, messageId));

    for (const row of mediaRows) {
      await this.storage.deleteObject(row.s3Key);
      if (row.thumbKey) await this.storage.deleteObject(row.thumbKey);
    }
  }
}
