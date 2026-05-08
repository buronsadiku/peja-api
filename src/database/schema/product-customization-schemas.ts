import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const productCustomizationSchemas = pgTable(
  'product_customization_schemas',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productType: text('product_type').notNull().unique(),
    schemaJson: jsonb('schema_json').notNull().default({}),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  () => [
    check(
      'product_customization_schemas_type_chk',
      sql`product_type IN ('gold_book','video_montage','digital_album','audio_vinyl','thank_you_cards','canvas_print')`,
    ),
  ],
);
