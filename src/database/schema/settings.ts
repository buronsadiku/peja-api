import { pgTable, uuid, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { events } from './events.js';

export const eventSettings = pgTable('event_privacy_settings', {
  eventId: uuid('event_id')
    .primaryKey()
    .references(() => events.id, { onDelete: 'cascade' }),
  visibility: text('visibility').notNull().default('private'),
  submissionsSenders: text('submissions_senders').notNull().default('invited'),
  submissionsSigninRequired: boolean('submissions_signin_required')
    .notNull()
    .default(false),
  reviewBeforePublish: boolean('review_before_publish').notNull().default(true),
  reviewFlagEnabled: boolean('review_flag_enabled').notNull().default(true),
  autoPublish: boolean('auto_publish').notNull().default(false),
  showMessageCount: boolean('show_message_count').notNull().default(true),
  showOtherMessages: boolean('show_other_messages').notNull().default(false),
  showContributorNames: boolean('show_contributor_names')
    .notNull()
    .default(false),
  aiTranscribe: boolean('ai_transcribe').notNull().default(true),
  aiShowTranscriptToGuest: boolean('ai_show_transcript_to_guest')
    .notNull()
    .default(true),
  aiSuggestions: boolean('ai_suggestions').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
