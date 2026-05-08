import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: text('email').unique().notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    fullName: text('full_name'),
    avatarUrl: text('avatar_url'),
    preferredLanguage: text('preferred_language').notNull().default('en'),
    emailPreferences: jsonb('email_preferences')
      .notNull()
      .default({ marketing: false, digest: true, alerts: true }),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('idx_users_created_at').on(table.createdAt)],
);
