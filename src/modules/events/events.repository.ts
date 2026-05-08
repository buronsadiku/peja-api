import { Injectable } from '@nestjs/common';
import { eq, and, isNull, desc, lt, sql, count } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { events } from '../../database/schema/index.js';
import { messages } from '../../database/schema/messages.js';
import { media } from '../../database/schema/media.js';

export type EventRow = typeof events.$inferSelect;
export type EventInsert = typeof events.$inferInsert;

@Injectable()
export class EventsRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<EventRow | undefined> {
    const rows = await this.db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    return rows[0];
  }

  async findBySlug(slug: string): Promise<EventRow | undefined> {
    const rows = await this.db
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), isNull(events.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findByOwner(
    ownerUserId: string,
    opts: { status?: string; cursor?: string; limit: number },
  ): Promise<EventRow[]> {
    const conditions = [
      eq(events.ownerUserId, ownerUserId),
      isNull(events.deletedAt),
    ];
    if (opts.status) conditions.push(eq(events.status, opts.status));
    if (opts.cursor)
      conditions.push(lt(events.createdAt, new Date(opts.cursor)));

    return this.db
      .select()
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.createdAt))
      .limit(opts.limit + 1);
  }

  async create(data: EventInsert): Promise<EventRow> {
    const rows = await this.db.insert(events).values(data).returning();
    return rows[0];
  }

  async update(id: string, data: Partial<EventInsert>): Promise<EventRow> {
    const rows = await this.db
      .update(events)
      .set(data)
      .where(eq(events.id, id))
      .returning();
    return rows[0];
  }

  async softDelete(id: string): Promise<EventRow> {
    const rows = await this.db
      .update(events)
      .set({ deletedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return rows[0];
  }

  async getStats(eventId: string) {
    const [messageRows, mediaRows] = await Promise.all([
      this.db
        .select({
          messageCount: count(),
          audioCount: count(messages.audioKey),
          writtenCount: count(messages.writtenNote),
          favoriteCount: sql<number>`count(*) filter (where ${messages.isFavorite} = true)`,
          totalAudioSeconds: sql<number>`coalesce(sum(${messages.audioDurationSec}), 0)`,
          lastMessageAt: sql<string>`max(${messages.createdAt})`,
        })
        .from(messages)
        .where(
          and(
            eq(messages.eventId, eventId),
            isNull(messages.deletedAt),
            sql`${messages.submissionSource} <> 'owner_upload'`,
          ),
        ),
      this.db
        .select({
          photoCount: sql<number>`count(*) filter (where ${media.type} = 'photo')`,
          videoCount: sql<number>`count(*) filter (where ${media.type} = 'video')`,
        })
        .from(media)
        .where(and(eq(media.eventId, eventId), isNull(media.deletedAt))),
    ]);

    return {
      ...messageRows[0],
      photoCount: Number(mediaRows[0]?.photoCount ?? 0),
      videoCount: Number(mediaRows[0]?.videoCount ?? 0),
    };
  }
}
