import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { creditTransactions, events } from '../../database/schema/index.js';

export type CreditTransactionType =
  | 'grant'
  | 'redeem'
  | 'refund'
  | 'expire'
  | 'adjustment';

interface MutateInput {
  eventId: string;
  userId: string;
  amountCents: number;
  reason?: string;
  orderId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class CreditsService {
  private readonly logger = new Logger('CreditsService');

  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async getBalance(eventId: string): Promise<number> {
    const rows = await this.db
      .select({ balance: events.keepsakeCreditCents })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    return rows[0]?.balance ?? 0;
  }

  grant(input: MutateInput) {
    if (input.amountCents <= 0) {
      throw new BadRequestException('grant amount must be positive');
    }
    return this.applyMutation('grant', input.amountCents, input);
  }

  redeem(input: MutateInput) {
    if (input.amountCents <= 0) {
      throw new BadRequestException('redeem amount must be positive');
    }
    return this.applyMutation('redeem', -input.amountCents, input);
  }

  async redeemUpToBalance(input: MutateInput): Promise<{
    applied: number;
    balanceAfterCents: number;
  }> {
    const balance = await this.getBalance(input.eventId);
    const applied = Math.max(0, Math.min(balance, input.amountCents));
    if (applied === 0) return { applied: 0, balanceAfterCents: balance };
    const row = await this.applyMutation('redeem', -applied, {
      ...input,
      amountCents: applied,
    });
    return { applied, balanceAfterCents: row.balanceAfterCents };
  }

  refund(input: MutateInput) {
    if (input.amountCents <= 0) {
      throw new BadRequestException('refund amount must be positive');
    }
    return this.applyMutation('refund', input.amountCents, input);
  }

  adjust(input: MutateInput) {
    return this.applyMutation('adjustment', input.amountCents, input);
  }

  expire(input: MutateInput) {
    if (input.amountCents <= 0) {
      throw new BadRequestException('expire amount must be positive');
    }
    return this.applyMutation('expire', -input.amountCents, input);
  }

  private async applyMutation(
    type: CreditTransactionType,
    signedDelta: number,
    input: MutateInput,
  ) {
    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(events)
        .set({
          keepsakeCreditCents: sql`${events.keepsakeCreditCents} + ${signedDelta}`,
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.eventId))
        .returning({ balance: events.keepsakeCreditCents });

      if (updated.length === 0) {
        throw new BadRequestException(`event not found: ${input.eventId}`);
      }
      const balanceAfter = updated[0].balance;
      if (balanceAfter < 0) {
        throw new BadRequestException('insufficient credit balance');
      }

      const [row] = await tx
        .insert(creditTransactions)
        .values({
          eventId: input.eventId,
          userId: input.userId,
          orderId: input.orderId ?? null,
          type,
          amountCents: signedDelta,
          balanceAfterCents: balanceAfter,
          reason: input.reason ?? null,
          metadata: input.metadata ?? {},
        })
        .returning();

      this.logger.log(
        { eventId: input.eventId, type, signedDelta, balanceAfter },
        'credit ledger entry',
      );
      return row;
    });
  }
}
