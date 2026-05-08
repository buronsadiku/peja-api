import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const vendors = pgTable(
  'vendors',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
    region: text('region').notNull(),
    apiEndpoint: text('api_endpoint'),
    apiCredentialsRef: text('api_credentials_ref'),
    contactEmail: text('contact_email'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_vendors_active_region').on(table.isActive, table.region),
  ],
);
