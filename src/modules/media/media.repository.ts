import { Injectable } from '@nestjs/common';
import {
  eq,
  and,
  isNull,
  desc,
  asc,
  lt,
  gt,
  inArray,
  ilike,
  or,
  type SQL,
} from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { media, messages, users } from '../../database/schema/index.js';

export type MediaRow = typeof media.$inferSelect;
export type MediaInsert = typeof media.$inferInsert;

export type GalleryRow = MediaRow & {
  uploaderName: string | null;
};

@Injectable()
export class MediaRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<MediaRow | undefined> {
    const rows = await this.db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);
    return rows[0];
  }

  async findManyByIds(ids: string[]): Promise<MediaRow[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(media).where(inArray(media.id, ids));
  }

  async findByMessageId(messageId: string): Promise<MediaRow[]> {
    return this.db
      .select()
      .from(media)
      .where(and(eq(media.messageId, messageId), isNull(media.deletedAt)))
      .orderBy(media.sortOrder, media.createdAt);
  }

  async findByMessageIds(
    messageIds: string[],
  ): Promise<Record<string, MediaRow[]>> {
    if (messageIds.length === 0) return {};
    const rows = await this.db
      .select()
      .from(media)
      .where(and(inArray(media.messageId, messageIds), isNull(media.deletedAt)))
      .orderBy(media.sortOrder, media.createdAt);
    const grouped: Record<string, MediaRow[]> = {};
    for (const row of rows) {
      if (!row.messageId) continue;
      grouped[row.messageId] ??= [];
      grouped[row.messageId].push(row);
    }
    return grouped;
  }

  async findGalleryFeed(
    eventId: string,
    opts: {
      type?: 'photo' | 'video';
      filter?: 'favorites' | 'gold_book';
      sort?: 'newest' | 'oldest';
      search?: string;
      cursor?: string;
      limit: number;
    },
  ): Promise<GalleryRow[]> {
    const conditions: SQL[] = [
      eq(media.eventId, eventId),
      isNull(media.deletedAt),
    ];
    if (opts.type) conditions.push(eq(media.type, opts.type));
    if (opts.filter === 'favorites')
      conditions.push(eq(media.isFavorite, true));
    if (opts.filter === 'gold_book')
      conditions.push(eq(media.isGoldBookSelected, true));

    if (opts.search) {
      const term = `%${opts.search}%`;
      const searchCondition = or(
        ilike(messages.guestNames, term),
        ilike(users.fullName, term),
        ilike(users.email, term),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const sort = opts.sort ?? 'newest';
    if (opts.cursor) {
      const cursorDate = new Date(opts.cursor);
      conditions.push(
        sort === 'oldest'
          ? gt(media.createdAt, cursorDate)
          : lt(media.createdAt, cursorDate),
      );
    }

    const rows = await this.db
      .select({
        media,
        guestNames: messages.guestNames,
        ownerName: users.fullName,
      })
      .from(media)
      .leftJoin(messages, eq(messages.id, media.messageId))
      .leftJoin(users, eq(users.id, media.uploaderUserId))
      .where(and(...conditions))
      .orderBy(sort === 'oldest' ? asc(media.createdAt) : desc(media.createdAt))
      .limit(opts.limit + 1);
    return rows.map((r) => ({
      ...r.media,
      uploaderName:
        r.media.uploaderType === 'guest'
          ? r.guestNames
          : r.ownerName?.trim() || null,
    }));
  }

  async create(data: MediaInsert): Promise<MediaRow> {
    const rows = await this.db.insert(media).values(data).returning();
    return rows[0];
  }

  async createMany(data: MediaInsert[]): Promise<MediaRow[]> {
    if (data.length === 0) return [];
    return this.db.insert(media).values(data).returning();
  }

  async update(id: string, data: Partial<MediaInsert>): Promise<MediaRow> {
    const rows = await this.db
      .update(media)
      .set(data)
      .where(eq(media.id, id))
      .returning();
    return rows[0];
  }

  async attachToMessage(mediaIds: string[], messageId: string): Promise<void> {
    if (mediaIds.length === 0) return;
    await this.db
      .update(media)
      .set({ messageId })
      .where(inArray(media.id, mediaIds));
  }

  async softDelete(id: string): Promise<MediaRow> {
    const rows = await this.db
      .update(media)
      .set({ deletedAt: new Date() })
      .where(eq(media.id, id))
      .returning();
    return rows[0];
  }
}
