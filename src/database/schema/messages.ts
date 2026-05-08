import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { events } from './events.js';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    guestNames: text('guest_names').notNull(),
    audioKey: text('audio_key'),
    audioDurationSec: integer('audio_duration_sec'),
    audioMimeType: text('audio_mime_type'),
    writtenNote: text('written_note'),
    transcript: text('transcript'),
    transcriptLanguage: text('transcript_language'),
    transcriptStatus: text('transcript_status').notNull().default('pending'),
    transcriptAttempts: integer('transcript_attempts').notNull().default(0),
    isFavorite: boolean('is_favorite').notNull().default(false),
    isGoldBookSelected: boolean('is_gold_book_selected')
      .notNull()
      .default(false),
    coupleNotes: text('couple_notes'),
    audioTrimStartSec: integer('audio_trim_start_sec'),
    audioTrimEndSec: integer('audio_trim_end_sec'),
    submissionSource: text('submission_source').notNull(),
    submissionLanguage: text('submission_language'),
    clientCreatedAt: timestamp('client_created_at', { withTimezone: true }),
    syncedAt: timestamp('synced_at', { withTimezone: true }),
    idempotencyKey: text('idempotency_key').unique().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_messages_event_id').on(table.eventId),
    index('idx_messages_event_created').on(table.eventId, table.createdAt),
    index('idx_messages_event_favorite')
      .on(table.eventId, table.isFavorite)
      .where(sql`is_favorite = TRUE`),
    index('idx_messages_event_gold_book')
      .on(table.eventId, table.isGoldBookSelected)
      .where(sql`is_gold_book_selected = TRUE`),
    uniqueIndex('idx_messages_idempotency').on(table.idempotencyKey),
    index('idx_messages_transcript_status')
      .on(table.transcriptStatus)
      .where(sql`transcript_status IN ('pending','processing')`),
  ],
);
