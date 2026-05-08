import { Injectable, Logger } from '@nestjs/common';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { authEvents } from '../../database/schema/index.js';

export type AuthEvent =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'session_create'
  | 'session_revoke'
  | 'oauth_link'
  | 'oauth_unlink'
  | 'password_change'
  | 'password_reset'
  | 'email_change'
  | 'csrf_failure'
  | 'risk_elevated';

export interface AuditEntry {
  userId: string | null;
  event: AuthEvent;
  ipHash?: string | null;
  uaHash?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger('AuditLog');

  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.db.insert(authEvents).values({
        userId: entry.userId,
        event: entry.event,
        ipHash: entry.ipHash ?? null,
        uaHash: entry.uaHash ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      });
      this.logger.log(
        {
          userId: entry.userId,
          event: entry.event,
          metadata: entry.metadata,
        },
        'auth_event',
      );
    } catch (err) {
      // Audit failures must not block requests, but they must be loud.
      this.logger.error(
        { err: (err as Error).message, entry },
        'failed to record auth_event',
      );
    }
  }
}
