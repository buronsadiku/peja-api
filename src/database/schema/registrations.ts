import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const registrations = pgTable(
  'registrations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    date: date('date').notNull(),
    responsibilityAccepted: boolean('responsibility_accepted').notNull(),
    notifyIfAbsent: boolean('notify_if_absent').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_registrations_email_date').on(table.email, table.date),
    index('idx_registrations_email').on(table.email),
    index('idx_registrations_date').on(table.date),
  ],
);

export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;
