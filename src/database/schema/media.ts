import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { events } from './events.js';
import { messages } from './messages.js';
import { users } from './users.js';

export const media = pgTable(
  'media',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').references(() => messages.id, {
      onDelete: 'cascade',
    }),
    uploaderType: text('uploader_type').notNull(),
    uploaderUserId: uuid('uploader_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    type: text('type').notNull(),
    s3Key: text('s3_key').notNull(),
    thumbKey: text('thumb_key'),
    mimeType: text('mime_type').notNull(),
    width: integer('width'),
    height: integer('height'),
    durationSec: integer('duration_sec'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    sortOrder: integer('sort_order').notNull().default(0),
    isFavorite: boolean('is_favorite').notNull().default(false),
    isGoldBookSelected: boolean('is_gold_book_selected')
      .notNull()
      .default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_media_event_feed')
      .on(table.eventId, table.deletedAt, table.createdAt)
      .where(sql`deleted_at IS NULL`),
    index('idx_media_message').on(table.messageId),
    index('idx_media_event_type').on(
      table.eventId,
      table.type,
      table.deletedAt,
    ),
    check('media_uploader_type_chk', sql`uploader_type IN ('guest','owner')`),
    check('media_type_chk', sql`type IN ('photo','video')`),
    check(
      'media_source_chk',
      sql`(uploader_type = 'guest') OR (uploader_type = 'owner' AND uploader_user_id IS NOT NULL)`,
    ),
  ],
);
