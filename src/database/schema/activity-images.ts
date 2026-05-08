import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { activityTemplates } from './activity-templates.js';

export const activityImages = pgTable(
  'activity_images',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    templateId: uuid('template_id')
      .notNull()
      .references(() => activityTemplates.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    alt: text('alt').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    isCover: boolean('is_cover').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_activity_images_template').on(table.templateId),
    index('idx_activity_images_sort').on(table.sortOrder),
  ],
);

export type ActivityImage = typeof activityImages.$inferSelect;
export type NewActivityImage = typeof activityImages.$inferInsert;
