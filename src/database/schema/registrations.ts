import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { festivalDays } from './festival-days.js';

export const registrations = pgTable(
  'registrations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    phone: text('phone').notNull(),
    festivalDayId: uuid('festival_day_id')
      .notNull()
      .references(() => festivalDays.id, { onDelete: 'restrict' }),
    responsibilityAccepted: boolean('responsibility_accepted').notNull(),
    notifyIfAbsent: boolean('notify_if_absent').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_registrations_email_day').on(
      table.email,
      table.festivalDayId,
    ),
    index('idx_registrations_email').on(table.email),
    index('idx_registrations_festival_day').on(table.festivalDayId),
  ],
);

export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;
