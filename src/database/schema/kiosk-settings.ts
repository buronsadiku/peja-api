import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { events } from './events.js';

export const kioskSettings = pgTable(
  'kiosk_settings',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),

    captureAudio: boolean('capture_audio').notNull().default(true),
    capturePhoto: boolean('capture_photo').notNull().default(true),
    captureVideo: boolean('capture_video').notNull().default(false),

    maxDurationSeconds: integer('max_duration_seconds').notNull().default(60),
    returnAfterSeconds: integer('return_after_seconds').notNull().default(30),

    fullscreenLock: boolean('fullscreen_lock').notNull().default(true),
    guidedMode: boolean('guided_mode').notNull().default(false),
    exitPin: text('exit_pin'),
    airplaneMode: boolean('airplane_mode').notNull().default(true),

    welcomeNote: text('welcome_note'),
    welcomeShowPhoto: boolean('welcome_show_photo').notNull().default(false),
    welcomeShowLanguagePicker: boolean('welcome_show_language_picker')
      .notNull()
      .default(true),
    welcomeChime: boolean('welcome_chime').notNull().default(true),

    offlineStore: boolean('offline_store').notNull().default(true),
    offlineStorageMb: integer('offline_storage_mb').notNull().default(500),
    offlineNotify: boolean('offline_notify').notNull().default(true),

    defaultLanguage: text('default_language').notNull().default('en'),
    supportedLanguages: text('supported_languages')
      .array()
      .notNull()
      .default(sql`ARRAY['en']::text[]`),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_kiosk_settings_event_id').on(table.eventId),
    index('idx_kiosk_settings_default_language').on(table.defaultLanguage),
    check(
      'kiosk_settings_max_duration_chk',
      sql`max_duration_seconds IN (15, 30, 60, 90, 120, 180)`,
    ),
    check(
      'kiosk_settings_return_after_chk',
      sql`return_after_seconds IN (10, 20, 30, 60, 120)`,
    ),
    check(
      'kiosk_settings_storage_chk',
      sql`offline_storage_mb BETWEEN 100 AND 5000`,
    ),
    check(
      'kiosk_settings_pin_chk',
      sql`exit_pin IS NULL OR exit_pin ~ '^[0-9]{4}$'`,
    ),
    check(
      'kiosk_settings_welcome_note_chk',
      sql`welcome_note IS NULL OR length(welcome_note) <= 180`,
    ),
  ],
);
