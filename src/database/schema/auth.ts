import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';

/**
 * Better Auth session. NestJS reads this on every authenticated request.
 *
 * - `token`: opaque secret used by Better Auth's cookie signature; we
 *   never compare it directly in NestJS (we verify the HMAC on the
 *   cookie value instead).
 * - `csrfToken`: random per-session value; required as `X-CSRF-Token`
 *   header on POST/PUT/PATCH/DELETE.
 * - `lastUsedAt`: activity timestamp, updated by the batched refresh
 *   service. Distinct from `updatedAt` (which marks row mutations).
 * - `lastIpHash`/`lastUaHash`: HMAC-SHA256 of the source IP and UA,
 *   peppered with `AUTH_HASH_PEPPER`. Used to detect session reuse
 *   from a different device without storing PII.
 * - `riskScore`: bumped on IP/UA mismatch; sensitive endpoints can gate
 *   on this and force re-auth.
 * - `freshAuthAt`: last password/OAuth confirmation time; account
 *   linking and password change require this within 5 minutes.
 */
export const session = pgTable(
  'session',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').unique().notNull(),
    csrfToken: text('csrf_token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    freshAuthAt: timestamp('fresh_auth_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    lastIpHash: text('last_ip_hash'),
    lastUaHash: text('last_ua_hash'),
    riskScore: integer('risk_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_session_user_id_last_used_at').on(
      table.userId,
      table.lastUsedAt.desc(),
    ),
    index('idx_session_expires_at').on(table.expiresAt),
  ],
);

/**
 * Better Auth account — credential storage and OAuth provider linkage.
 */
export const account = pgTable(
  'account',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_account_user_id').on(table.userId),
    index('idx_account_provider').on(table.providerId, table.accountId),
  ],
);

/**
 * Better Auth verification — single-use tokens for email verification
 * and password reset, expired by the cleanup cron.
 */
export const verification = pgTable(
  'verification',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('idx_verification_identifier').on(table.identifier)],
);

/**
 * Better Auth rate-limit storage. Configured via `rateLimit.storage:
 * 'database'` so per-path rules survive process restart and apply across
 * NestJS replicas.
 */
export const rateLimit = pgTable(
  'rate_limit',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: text('key').unique().notNull(),
    count: integer('count').notNull().default(0),
    lastRequest: bigint('lastRequest', { mode: 'number' }).notNull(),
  },
  (table) => [index('idx_rate_limit_last_request').on(table.lastRequest)],
);

/**
 * Audit log of authentication-relevant events. Append only — never
 * updated. Indexed for per-user lookup and time-bounded scans.
 */
export const authEvents = pgTable(
  'auth_events',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    event: text('event').notNull(),
    ipHash: text('ip_hash'),
    uaHash: text('ua_hash'),
    metadata: text('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_auth_events_user_id_created_at').on(
      table.userId,
      table.createdAt.desc(),
    ),
    index('idx_auth_events_event_created_at').on(
      table.event,
      table.createdAt.desc(),
    ),
  ],
);
