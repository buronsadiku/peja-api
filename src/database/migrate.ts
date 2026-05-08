import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { getEnv } from '../config/env.js';

/**
 * Postgres advisory lock key. The migration runner takes this lock
 * before applying any migrations; concurrent NestJS instances on the
 * same database wait on this lock and apply nothing once the leader
 * finishes (Drizzle's migrations table records what's already applied).
 *
 * Pick once and never change — switching the value would let two
 * instances migrate simultaneously across the cutover.
 */
const MIGRATION_LOCK_KEY = 928_374_651;

const migrationsFolder = (): string => {
  // Same path in dev (running from src/) and prod (running from dist/src/)
  // because nest-cli copies src/database/migrations/** to dist/src/database/.
  return join(__dirname, 'migrations');
};

/**
 * Apply pending Drizzle migrations on startup. Safe under concurrent
 * boots on the same database — only the first instance runs the
 * migrator; the others block on the advisory lock and then continue.
 */
export const runMigrations = async (): Promise<void> => {
  const logger = new Logger('Migrations');
  const env = getEnv();

  if (env.AUTO_MIGRATE === 'false') {
    logger.warn('AUTO_MIGRATE=false — skipping startup migrations');
    return;
  }

  // Single-connection pool: migrations are short, one-shot, and we want
  // the lock pinned to one connection so the unlock targets the same
  // session.
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
  const db = drizzle(pool);

  const start = Date.now();
  try {
    logger.log('Acquiring migration advisory lock');
    await pool.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);

    try {
      logger.log('Applying migrations');
      await migrate(db, { migrationsFolder: migrationsFolder() });
      logger.log(`Migrations done in ${Date.now() - start}ms`);
    } finally {
      await pool.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    }
  } catch (err) {
    logger.error(
      { err: (err as Error).message, stack: (err as Error).stack },
      'Migration failure — aborting boot',
    );
    throw err;
  } finally {
    await pool.end();
  }
};
