import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { events } from './events.js';
import { users } from './users.js';
import { orders } from './orders.js';

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    orderId: uuid('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    type: text('type').notNull(),
    amountCents: integer('amount_cents').notNull(),
    balanceAfterCents: integer('balance_after_cents').notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_credit_tx_event_created').on(table.eventId, table.createdAt),
    index('idx_credit_tx_user_created').on(table.userId, table.createdAt),
    index('idx_credit_tx_order').on(table.orderId),
    check(
      'credit_transactions_type_chk',
      sql`type IN ('grant','redeem','refund','expire','adjustment')`,
    ),
  ],
);
