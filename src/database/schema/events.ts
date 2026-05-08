import {
  pgTable,
  uuid,
  text,
  date,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

export const events = pgTable(
  'events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').unique().notNull(),
    partnerAName: text('partner_a_name').notNull(),
    partnerBName: text('partner_b_name').notNull(),
    weddingDate: date('wedding_date'),
    venueName: text('venue_name'),
    venueCity: text('venue_city'),
    expectedGuests: integer('expected_guests'),
    welcomeMessage: text('welcome_message'),
    themeColor: text('theme_color').notNull().default('#779FEB'),
    couplePhotoUrl: text('couple_photo_url'),
    planTier: text('plan_tier'),
    planPurchasedAt: timestamp('plan_purchased_at', { withTimezone: true }),
    messageLimit: integer('message_limit'),
    storageExpiresAt: timestamp('storage_expires_at', { withTimezone: true }),
    // Cached SUM of credit_transactions.amount_cents for this event.
    // Updated transactionally by CreditsService alongside ledger inserts.
    keepsakeCreditCents: integer('keepsake_credit_cents').notNull().default(0),
    status: text('status').notNull().default('draft'),
    qrCodeUrl: text('qr_code_url'),
    defaultLanguage: text('default_language').notNull().default('en'),
    kioskPinHash: text('kiosk_pin_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_events_owner_user_id').on(table.ownerUserId),
    uniqueIndex('idx_events_slug_active')
      .on(table.slug)
      .where(sql`deleted_at IS NULL`),
    index('idx_events_wedding_date').on(table.weddingDate),
    index('idx_events_status').on(table.status),
  ],
);
