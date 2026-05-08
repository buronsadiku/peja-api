import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';

@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger('AuthCleanup');

  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupSessions() {
    const result = await this.db.execute(sql`
      DELETE FROM session
      WHERE expires_at < NOW()
         OR last_used_at < NOW() - INTERVAL '7 days'
    `);
    this.logger.log(
      { deleted: result.rowCount ?? 0 },
      'sessions cleanup complete',
    );
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupVerificationTokens() {
    const result = await this.db.execute(sql`
      DELETE FROM verification
      WHERE "expiresAt" < NOW()
    `);
    this.logger.log(
      { deleted: result.rowCount ?? 0 },
      'verification tokens cleanup complete',
    );
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupAuthEvents() {
    const result = await this.db.execute(sql`
      DELETE FROM auth_events
      WHERE created_at < NOW() - INTERVAL '180 days'
    `);
    this.logger.log(
      { deleted: result.rowCount ?? 0 },
      'auth events cleanup complete',
    );
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupRateLimits() {
    const result = await this.db.execute(sql`
      DELETE FROM rate_limit
      WHERE "lastRequest" < (EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000)::bigint
    `);
    this.logger.log(
      { deleted: result.rowCount ?? 0 },
      'rate limits cleanup complete',
    );
  }
}
