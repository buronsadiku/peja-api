import { Injectable, Logger } from '@nestjs/common';
import { eq, and, isNull, lt, isNotNull } from 'drizzle-orm';
import { InjectDrizzle } from '../../../database/database.decorator.js';
import type { DrizzleDB } from '../../../database/database.types.js';
import { messages, events } from '../../../database/schema/index.js';
import { MessageMediaCleaner } from './message-media-cleaner.js';

@Injectable()
export class ExpiredMediaCleanupService {
  private readonly logger = new Logger('ExpiredMediaCleanup');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly cleaner: MessageMediaCleaner,
  ) {}

  async run(): Promise<void> {
    this.logger.log('Starting expired media cleanup');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const expiredMessages = await this.db
      .select()
      .from(messages)
      .where(
        and(
          isNotNull(messages.deletedAt),
          lt(messages.deletedAt, sevenDaysAgo),
        ),
      )
      .limit(100);

    for (const msg of expiredMessages) {
      await this.cleaner.deleteForMessage(msg.id);
      await this.db.delete(messages).where(eq(messages.id, msg.id));
      this.logger.log({ messageId: msg.id }, 'Hard-deleted expired message');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredEvents = await this.db
      .select()
      .from(events)
      .where(
        and(
          isNotNull(events.storageExpiresAt),
          lt(events.storageExpiresAt, thirtyDaysAgo),
          isNull(events.deletedAt),
        ),
      )
      .limit(20);

    for (const event of expiredEvents) {
      const eventMessages = await this.db
        .select()
        .from(messages)
        .where(eq(messages.eventId, event.id));

      for (const msg of eventMessages) {
        await this.cleaner.deleteForMessage(msg.id);
      }

      await this.db
        .update(events)
        .set({ status: 'archived' })
        .where(eq(events.id, event.id));
      this.logger.log(
        { eventId: event.id },
        'Archived expired event and deleted media',
      );
    }

    this.logger.log(
      {
        deletedMessages: expiredMessages.length,
        archivedEvents: expiredEvents.length,
      },
      'Expired media cleanup complete',
    );
  }
}
