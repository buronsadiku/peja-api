import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { kioskSettings } from '../../database/schema/index.js';

export type KioskSettingsRow = typeof kioskSettings.$inferSelect;
export type KioskSettingsInsert = typeof kioskSettings.$inferInsert;
export type KioskSettingsUpdate = Partial<
  Omit<KioskSettingsInsert, 'id' | 'eventId' | 'createdAt'>
>;

@Injectable()
export class KioskSettingsRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findByEventId(eventId: string): Promise<KioskSettingsRow | undefined> {
    const rows = await this.db
      .select()
      .from(kioskSettings)
      .where(eq(kioskSettings.eventId, eventId))
      .limit(1);
    return rows[0];
  }

  async createForEvent(
    eventId: string,
    defaults: Partial<KioskSettingsInsert> = {},
  ): Promise<KioskSettingsRow> {
    const rows = await this.db
      .insert(kioskSettings)
      .values({ eventId, ...defaults })
      .returning();
    return rows[0];
  }

  async updateByEventId(
    eventId: string,
    data: KioskSettingsUpdate,
  ): Promise<KioskSettingsRow | undefined> {
    const rows = await this.db
      .update(kioskSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(kioskSettings.eventId, eventId))
      .returning();
    return rows[0];
  }
}
