import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const activityCategoryEnum = pgEnum('activity_category', [
  'workshop',
  'adventure',
  'music',
  'food',
  'wellness',
  'cultural',
]);

export const activityTemplates = pgTable(
  'activity_templates',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    category: activityCategoryEnum('category').notNull().default('workshop'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_activity_templates_slug').on(table.slug)],
);

export type ActivityTemplate = typeof activityTemplates.$inferSelect;
export type NewActivityTemplate = typeof activityTemplates.$inferInsert;
