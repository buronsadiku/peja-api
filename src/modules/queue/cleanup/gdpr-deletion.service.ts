import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../../database/database.decorator.js';
import type { DrizzleDB } from '../../../database/database.types.js';
import {
  messages,
  events,
  users,
  orders,
  invitations,
} from '../../../database/schema/index.js';
import { MessageMediaCleaner } from './message-media-cleaner.js';

@Injectable()
export class GdprDeletionService {
  private readonly logger = new Logger('GdprDeletion');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly cleaner: MessageMediaCleaner,
  ) {}

  async run(userId: string): Promise<void> {
    this.logger.log({ userId }, 'Starting GDPR deletion');

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || !user.deletedAt) {
      this.logger.log(
        { userId },
        'User not deleted or not found — skipping GDPR deletion',
      );
      return;
    }

    const userEvents = await this.db
      .select()
      .from(events)
      .where(eq(events.ownerUserId, userId));

    for (const event of userEvents) {
      const eventMessages = await this.db
        .select()
        .from(messages)
        .where(eq(messages.eventId, event.id));
      for (const msg of eventMessages) {
        await this.cleaner.deleteForMessage(msg.id);
      }

      await this.db.delete(messages).where(eq(messages.eventId, event.id));

      await this.db
        .delete(invitations)
        .where(eq(invitations.eventId, event.id));
    }

    await this.db.delete(events).where(eq(events.ownerUserId, userId));

    await this.db
      .update(orders)
      .set({
        shippingName: 'DELETED',
        shippingPhone: null,
        shippingAddressLine1: null,
        shippingAddressLine2: null,
        metadata: {},
      })
      .where(eq(orders.userId, userId));

    await this.db.delete(users).where(eq(users.id, userId));

    this.logger.log({ userId }, 'GDPR deletion complete');
  }
}
