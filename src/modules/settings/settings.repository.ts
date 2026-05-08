import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { eventSettings } from '../../database/schema/index.js';

export type SettingsRow = typeof eventSettings.$inferSelect;
export type SettingsInsert = typeof eventSettings.$inferInsert;

@Injectable()
export class SettingsRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findByEventId(eventId: string): Promise<SettingsRow | undefined> {
    const rows = await this.db
      .select()
      .from(eventSettings)
      .where(eq(eventSettings.eventId, eventId))
      .limit(1);
    return rows[0];
  }

  async create(data: SettingsInsert): Promise<SettingsRow> {
    const rows = await this.db.insert(eventSettings).values(data).returning();
    return rows[0];
  }

  async update(
    eventId: string,
    data: Partial<SettingsInsert>,
  ): Promise<SettingsRow> {
    const rows = await this.db
      .update(eventSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(eventSettings.eventId, eventId))
      .returning();
    return rows[0];
  }
}
