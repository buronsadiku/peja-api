import { Injectable } from '@nestjs/common';
import {
  eq,
  and,
  isNull,
  desc,
  lt,
  sql,
  count,
  like,
  or,
  type SQL,
} from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { messages } from '../../database/schema/index.js';

export type MessageRow = typeof messages.$inferSelect;
export type MessageInsert = typeof messages.$inferInsert;

@Injectable()
export class MessagesRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<MessageRow | undefined> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);
    return rows[0];
  }

  async findByIdempotencyKey(key: string): Promise<MessageRow | undefined> {
    const rows = await this.db
      .select()
      .from(messages)
      .where(eq(messages.idempotencyKey, key))
      .limit(1);
    return rows[0];
  }

  async findByEvent(
    eventId: string,
    opts: {
      filter?: string;
      search?: string;
      sort?: string;
      cursor?: string;
      limit: number;
      includeOwnerUploads?: boolean;
    },
  ): Promise<MessageRow[]> {
    const conditions: SQL[] = [
      eq(messages.eventId, eventId),
      isNull(messages.deletedAt),
    ];

    if (!opts.includeOwnerUploads) {
      conditions.push(sql`${messages.submissionSource} <> 'owner_upload'`);
    }

    if (opts.filter === 'favorites')
      conditions.push(eq(messages.isFavorite, true));
    if (opts.filter === 'with_photo')
      conditions.push(
        sql`EXISTS (SELECT 1 FROM media m WHERE m.message_id = ${messages.id} AND m.type = 'photo' AND m.deleted_at IS NULL)`,
      );
    if (opts.filter === 'with_video')
      conditions.push(
        sql`EXISTS (SELECT 1 FROM media m WHERE m.message_id = ${messages.id} AND m.type = 'video' AND m.deleted_at IS NULL)`,
      );
    if (opts.filter === 'audio_only')
      conditions.push(
        sql`${messages.audioKey} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM media m WHERE m.message_id = ${messages.id} AND m.deleted_at IS NULL)`,
      );

    if (opts.search) {
      const term = `%${opts.search}%`;
      const searchCondition = or(
        like(messages.guestNames, term),
        like(messages.transcript, term),
        like(messages.coupleNotes, term),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (opts.cursor) {
      conditions.push(lt(messages.createdAt, new Date(opts.cursor)));
    }

    let orderBy: SQL = desc(messages.createdAt);
    if (opts.sort === 'oldest') orderBy = sql`${messages.createdAt} ASC`;
    if (opts.sort === 'longest')
      orderBy = sql`${messages.audioDurationSec} DESC NULLS LAST`;

    return this.db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(opts.limit + 1);
  }

  async create(data: MessageInsert): Promise<MessageRow> {
    const rows = await this.db.insert(messages).values(data).returning();
    return rows[0];
  }

  async update(id: string, data: Partial<MessageInsert>): Promise<MessageRow> {
    const rows = await this.db
      .update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();
    return rows[0];
  }

  async softDelete(id: string): Promise<MessageRow> {
    const rows = await this.db
      .update(messages)
      .set({ deletedAt: new Date() })
      .where(eq(messages.id, id))
      .returning();
    return rows[0];
  }

  async countByEvent(eventId: string): Promise<number> {
    const result = await this.db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.eventId, eventId), isNull(messages.deletedAt)));
    return result[0]?.count ?? 0;
  }
}
