import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';

interface SessionTouch {
  lastUsedAt: Date;
  ipHash: string | null;
  uaHash: string | null;
  riskBump: number;
}

const FLUSH_INTERVAL_MS = 30_000;
const MAX_QUEUE_SIZE = 5_000;

/**
 * Queues per-session activity updates and flushes them in a single
 * batched UPDATE every 30 seconds. Replaces fire-and-forget refreshes:
 * the queue is process-visible, failures are logged with context, and
 * the batch runs outside the request cycle so latency is unaffected.
 *
 * Tradeoff: up to 30s of activity may be lost on SIGKILL. Acceptable
 * for sliding refresh and IP/UA anomaly tracking.
 */
@Injectable()
export class SessionRefreshService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger('SessionRefresh');
  private readonly queue = new Map<string, SessionTouch>();
  private timer: NodeJS.Timeout | null = null;

  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
    this.timer.unref();
  }

  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.flush();
  }

  /**
   * Record activity for a session. Within a single flush window:
   * - lastUsedAt overwrites (last-write-wins)
   * - riskBump accumulates
   * - ipHash/uaHash overwrite if present, retain existing otherwise
   */
  enqueue(
    sessionId: string,
    update: {
      ipHash: string | null;
      uaHash: string | null;
      riskBump: number;
    },
  ): void {
    if (this.queue.size >= MAX_QUEUE_SIZE) {
      for (const oldestId of this.queue.keys()) {
        this.queue.delete(oldestId);
        break;
      }
      void this.flush();
    }

    const existing = this.queue.get(sessionId);
    this.queue.set(sessionId, {
      lastUsedAt: new Date(),
      ipHash: update.ipHash ?? existing?.ipHash ?? null,
      uaHash: update.uaHash ?? existing?.uaHash ?? null,
      riskBump: (existing?.riskBump ?? 0) + update.riskBump,
    });
  }

  async flush(): Promise<void> {
    if (this.queue.size === 0) return;
    const snapshot = Array.from(this.queue.entries());
    this.queue.clear();

    const rows = snapshot.map(
      ([id, t]) =>
        sql`(${id}::uuid, ${t.lastUsedAt.toISOString()}::timestamptz, ${t.ipHash}::text, ${t.uaHash}::text, ${t.riskBump}::int)`,
    );

    try {
      await this.db.execute(sql`
        UPDATE session AS s
        SET
          last_used_at = v.last_used_at,
          last_ip_hash = COALESCE(v.ip_hash, s.last_ip_hash),
          last_ua_hash = COALESCE(v.ua_hash, s.last_ua_hash),
          risk_score = LEAST(s.risk_score + v.risk_bump, 100),
          updated_at = NOW()
        FROM (VALUES ${sql.join(rows, sql`, `)}) AS v(id, last_used_at, ip_hash, ua_hash, risk_bump)
        WHERE s.id = v.id
      `);
    } catch (err) {
      // Re-queue on transient failure; bounded re-entry stops a stuck DB
      // from filling memory.
      for (const [id, t] of snapshot) {
        if (!this.queue.has(id) && this.queue.size < MAX_QUEUE_SIZE) {
          this.queue.set(id, t);
        }
      }
      this.logger.error(
        { err: (err as Error).message, batchSize: snapshot.length },
        'session refresh flush failed',
      );
    }
  }
}
