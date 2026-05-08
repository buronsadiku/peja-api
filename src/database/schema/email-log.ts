import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { events } from './events.js';

export const emailLog = pgTable(
  'email_log',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    eventId: uuid('event_id').references(() => events.id, {
      onDelete: 'set null',
    }),
    template: text('template').notNull(),
    toEmail: text('to_email').notNull(),
    language: text('language').notNull(),
    provider: text('provider').notNull(),
    providerId: text('provider_id'),
    status: text('status').notNull(),
    error: text('error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_email_log_user_id').on(table.userId),
    index('idx_email_log_event_id').on(table.eventId),
    index('idx_email_log_template').on(table.template),
  ],
);
