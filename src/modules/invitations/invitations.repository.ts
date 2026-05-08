import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { invitations } from '../../database/schema/index.js';

export type InvitationRow = typeof invitations.$inferSelect;
export type InvitationInsert = typeof invitations.$inferInsert;

@Injectable()
export class InvitationsRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async create(data: InvitationInsert): Promise<InvitationRow> {
    const rows = await this.db.insert(invitations).values(data).returning();
    return rows[0];
  }

  async getStatsByEvent(eventId: string) {
    const rows = await this.db
      .select({
        channel: invitations.channel,
        sent: sql<number>`count(*)`,
        opened: sql<number>`count(${invitations.openedAt})`,
        submitted: sql<number>`count(${invitations.submittedAt})`,
      })
      .from(invitations)
      .where(eq(invitations.eventId, eventId))
      .groupBy(invitations.channel);

    const byChannel: Record<
      string,
      { sent: number; opened: number; submitted: number }
    > = {};
    let totalSent = 0,
      totalOpened = 0,
      totalSubmitted = 0;

    for (const row of rows) {
      byChannel[row.channel] = {
        sent: Number(row.sent),
        opened: Number(row.opened),
        submitted: Number(row.submitted),
      };
      totalSent += Number(row.sent);
      totalOpened += Number(row.opened);
      totalSubmitted += Number(row.submitted);
    }

    return {
      byChannel,
      totals: {
        sent: totalSent,
        opened: totalOpened,
        submitted: totalSubmitted,
      },
    };
  }
}
