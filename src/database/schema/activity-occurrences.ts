import {
  pgTable,
  uuid,
  text,
  timestamp,
  time,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { activityTemplates } from './activity-templates.js';
import { festivalDays } from './festival-days.js';

export const activityOccurrences = pgTable(
  'activity_occurrences',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    templateId: uuid('template_id')
      .notNull()
      .references(() => activityTemplates.id, { onDelete: 'cascade' }),
    festivalDayId: uuid('festival_day_id')
      .notNull()
      .references(() => festivalDays.id, { onDelete: 'restrict' }),
    startTime: time('start_time').notNull(),
    endTime: time('end_time').notNull(),
    capacity: integer('capacity').notNull().default(0),
    location: text('location'),
    meetingPoint: text('meeting_point'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_activity_occurrences_festival_day').on(table.festivalDayId),
    index('idx_activity_occurrences_template_id').on(table.templateId),
  ],
);

export type ActivityOccurrence = typeof activityOccurrences.$inferSelect;
export type NewActivityOccurrence = typeof activityOccurrences.$inferInsert;
