import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { registrations } from './registrations.js';
import { activityOccurrences } from './activity-occurrences.js';

export const registrationActivities = pgTable(
  'registration_activities',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id, { onDelete: 'cascade' }),
    occurrenceId: uuid('occurrence_id')
      .notNull()
      .references(() => activityOccurrences.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('uniq_reg_activities_reg_occurrence').on(
      table.registrationId,
      table.occurrenceId,
    ),
    index('idx_reg_activities_occurrence').on(table.occurrenceId),
  ],
);

export type RegistrationActivity = typeof registrationActivities.$inferSelect;
export type NewRegistrationActivity =
  typeof registrationActivities.$inferInsert;
