import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sql } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { creditTransactions, events } from '../../database/schema/index.js';

interface DriftRow {
  eventId: string;
  cachedCents: number;
  ledgerCents: number;
  driftCents: number;
}

@Injectable()
export class CreditsReconciliationService {
  private readonly logger = new Logger('CreditsReconciliation');

  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: 'credits-reconciliation',
    timeZone: 'UTC',
  })
  async runDaily(): Promise<void> {
    this.logger.log('Reconciliation started');
    const drifts = await this.findDrift();
    if (drifts.length === 0) {
      this.logger.log('Reconciliation clean — no drift');
      return;
    }
    for (const drift of drifts) {
      this.logger.error(
        {
          eventId: drift.eventId,
          cachedCents: drift.cachedCents,
          ledgerCents: drift.ledgerCents,
          driftCents: drift.driftCents,
        },
        'Credit drift detected',
      );
    }
  }

  async findDrift(): Promise<DriftRow[]> {
    const rows = await this.db.execute<{
      event_id: string;
      cached_cents: number;
      ledger_cents: number | null;
    }>(sql`
      SELECT
        e.id AS event_id,
        e.keepsake_credit_cents AS cached_cents,
        COALESCE(SUM(ct.amount_cents), 0)::int AS ledger_cents
      FROM ${events} e
      LEFT JOIN ${creditTransactions} ct ON ct.event_id = e.id
      WHERE e.deleted_at IS NULL
      GROUP BY e.id, e.keepsake_credit_cents
      HAVING e.keepsake_credit_cents <> COALESCE(SUM(ct.amount_cents), 0)
    `);

    return rows.rows.map((row) => ({
      eventId: row.event_id,
      cachedCents: row.cached_cents,
      ledgerCents: row.ledger_cents ?? 0,
      driftCents: row.cached_cents - (row.ledger_cents ?? 0),
    }));
  }
}
