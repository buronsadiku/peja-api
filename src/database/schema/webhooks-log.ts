import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const webhooksLog = pgTable(
  'webhooks_log',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: text('provider').notNull(),
    eventType: text('event_type').notNull(),
    providerEventId: text('provider_event_id').notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    processingError: text('processing_error'),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('uq_webhooks_provider_event').on(
      table.provider,
      table.providerEventId,
    ),
    index('idx_webhooks_log_received').on(table.receivedAt),
    index('idx_webhooks_log_unprocessed')
      .on(table.provider, table.processedAt)
      .where(sql`processed_at IS NULL`),
  ],
);
