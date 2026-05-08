import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { plans } from '../../database/schema/index.js';

export type PlanRow = typeof plans.$inferSelect;
export type PlanInsert = typeof plans.$inferInsert;

@Injectable()
export class PlansRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findByCode(code: string): Promise<PlanRow | undefined> {
    const rows = await this.db
      .select()
      .from(plans)
      .where(eq(plans.code, code))
      .limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<PlanRow | undefined> {
    const rows = await this.db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);
    return rows[0];
  }

  async listActive(): Promise<PlanRow[]> {
    return this.db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(plans.sortOrder);
  }

  async upsert(input: PlanInsert): Promise<PlanRow> {
    const existing = await this.findByCode(input.code);
    if (existing) return existing;
    const rows = await this.db.insert(plans).values(input).returning();
    return rows[0];
  }

  async setStripePriceId(
    code: string,
    stripePriceId: string | null,
  ): Promise<void> {
    await this.db
      .update(plans)
      .set({ stripePriceId, updatedAt: new Date() })
      .where(and(eq(plans.code, code)));
  }
}
