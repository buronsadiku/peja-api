import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { events } from './events.js';
import { orderItems } from './order-items.js';
import { jobsLog } from './jobs-log.js';

export const keepsakeRenders = pgTable(
  'keepsake_renders',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderItemId: uuid('order_item_id').references(() => orderItems.id, {
      onDelete: 'cascade',
    }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    productType: text('product_type').notNull(),
    renderType: text('render_type').notNull(),
    version: integer('version').notNull().default(1),
    status: text('status').notNull().default('queued'),
    s3Key: text('s3_key'),
    s3Bucket: text('s3_bucket'),
    mimeType: text('mime_type'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    pageCount: integer('page_count'),
    durationSec: integer('duration_sec'),
    jobLogId: uuid('job_log_id').references(() => jobsLog.id, {
      onDelete: 'set null',
    }),
    inputPayload: jsonb('input_payload').notNull().default({}),
    errorMessage: text('error_message'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_keepsake_renders_item_version').on(
      table.orderItemId,
      table.version,
    ),
    index('idx_keepsake_renders_event_type_status').on(
      table.eventId,
      table.productType,
      table.status,
    ),
    index('idx_keepsake_renders_worker_poll')
      .on(table.status, table.createdAt)
      .where(sql`status IN ('queued','rendering')`),
    check(
      'keepsake_renders_type_chk',
      sql`product_type IN ('gold_book','video_montage','digital_album','audio_vinyl','thank_you_cards','canvas_print')`,
    ),
    check(
      'keepsake_renders_render_type_chk',
      sql`render_type IN ('preview','final')`,
    ),
    check(
      'keepsake_renders_status_chk',
      sql`status IN ('queued','rendering','completed','failed')`,
    ),
  ],
);
