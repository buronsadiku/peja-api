import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { keepsakeRenders } from '../../database/schema/index.js';

export type KeepsakeRenderRow = typeof keepsakeRenders.$inferSelect;
export type KeepsakeRenderInsert = typeof keepsakeRenders.$inferInsert;

@Injectable()
export class RendersRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async create(input: KeepsakeRenderInsert): Promise<KeepsakeRenderRow> {
    const rows = await this.db
      .insert(keepsakeRenders)
      .values(input)
      .returning();
    return rows[0];
  }

  async markRendering(id: string): Promise<void> {
    await this.db
      .update(keepsakeRenders)
      .set({
        status: 'rendering',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(keepsakeRenders.id, id));
  }

  async markCompleted(
    id: string,
    artifact: {
      s3Key?: string | null;
      s3Bucket?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      pageCount?: number | null;
      durationSec?: number | null;
    },
  ): Promise<void> {
    await this.db
      .update(keepsakeRenders)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
        ...artifact,
      })
      .where(eq(keepsakeRenders.id, id));
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.db
      .update(keepsakeRenders)
      .set({
        status: 'failed',
        completedAt: new Date(),
        updatedAt: new Date(),
        errorMessage,
      })
      .where(eq(keepsakeRenders.id, id));
  }

  async findByJobLogId(
    jobLogId: string,
  ): Promise<KeepsakeRenderRow | undefined> {
    const rows = await this.db
      .select()
      .from(keepsakeRenders)
      .where(eq(keepsakeRenders.jobLogId, jobLogId))
      .limit(1);
    return rows[0];
  }
}
