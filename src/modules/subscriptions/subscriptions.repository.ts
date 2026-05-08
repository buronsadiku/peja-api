import { Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { subscriptions } from '../../database/schema/index.js';

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type SubscriptionInsert = typeof subscriptions.$inferInsert;

@Injectable()
export class SubscriptionsRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findActiveByEvent(
    eventId: string,
  ): Promise<SubscriptionRow | undefined> {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.eventId, eventId),
          eq(subscriptions.status, 'active'),
        ),
      )
      .orderBy(desc(subscriptions.activatedAt))
      .limit(1);
    return rows[0];
  }

  async findByEvent(eventId: string): Promise<SubscriptionRow[]> {
    return this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.eventId, eventId))
      .orderBy(desc(subscriptions.activatedAt));
  }

  async create(input: SubscriptionInsert): Promise<SubscriptionRow> {
    const rows = await this.db.insert(subscriptions).values(input).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<SubscriptionInsert>,
  ): Promise<SubscriptionRow> {
    const rows = await this.db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return rows[0];
  }

  async deductCredits(
    id: string,
    amountCents: number,
  ): Promise<SubscriptionRow | undefined> {
    const [current] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);
    if (!current) return undefined;
    const next = Math.max(0, current.creditCentsRemaining - amountCents);
    const rows = await this.db
      .update(subscriptions)
      .set({ creditCentsRemaining: next, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return rows[0];
  }

  async cancelByEvent(eventId: string): Promise<void> {
    await this.db
      .update(subscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.eventId, eventId),
          eq(subscriptions.status, 'active'),
        ),
      );
  }
}
