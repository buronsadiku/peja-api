import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { orderPromotions, promotions } from '../../database/schema/index.js';

export type PromotionType =
  | 'percentage'
  | 'fixed_amount'
  | 'free_shipping'
  | 'bundle';

export interface PromotionConditions {
  minSubtotalCents?: number;
  productSkus?: string[];
  firstOrderOnly?: boolean;
}

interface ApplyResult {
  promotionId: string;
  discountCents: number;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger('PromotionsService');

  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async validateAndApply(
    orderId: string,
    code: string,
    subtotalCents: number,
  ): Promise<ApplyResult> {
    const promo = await this.findActiveByCode(code);
    if (!promo) throw new NotFoundException(`promo not found: ${code}`);

    const conditions = (promo.conditionsJson ?? {}) as PromotionConditions;
    if (
      conditions.minSubtotalCents != null &&
      subtotalCents < conditions.minSubtotalCents
    ) {
      throw new BadRequestException(
        `subtotal ${subtotalCents} below minimum ${conditions.minSubtotalCents}`,
      );
    }

    const discountCents = this.computeDiscount(
      promo.type as PromotionType,
      promo.value,
      subtotalCents,
    );

    return this.db.transaction(async (tx) => {
      const claimed = await tx
        .update(promotions)
        .set({
          redemptionsCount: sql`${promotions.redemptionsCount} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(promotions.id, promo.id),
            or(
              isNull(promotions.maxRedemptions),
              lte(
                sql`${promotions.redemptionsCount} + 1`,
                promotions.maxRedemptions,
              ),
            ),
          ),
        )
        .returning({ id: promotions.id });

      if (claimed.length === 0) {
        throw new BadRequestException('promo redemption limit reached');
      }

      await tx.insert(orderPromotions).values({
        orderId,
        promotionId: promo.id,
        discountCents,
      });

      this.logger.log(
        { orderId, promotionId: promo.id, discountCents },
        'promo applied',
      );
      return { promotionId: promo.id, discountCents };
    });
  }

  private async findActiveByCode(code: string) {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(promotions)
      .where(and(eq(promotions.code, code), eq(promotions.isActive, true)))
      .limit(1);
    const promo = rows[0];
    if (!promo) return undefined;
    if (promo.startsAt && promo.startsAt > now) return undefined;
    if (promo.endsAt && promo.endsAt < now) return undefined;
    return promo;
  }

  private computeDiscount(
    type: PromotionType,
    value: number,
    subtotalCents: number,
  ): number {
    switch (type) {
      case 'percentage':
        return Math.floor((subtotalCents * value) / 100);
      case 'fixed_amount':
        return Math.min(value, subtotalCents);
      case 'free_shipping':
      case 'bundle':
        return value;
    }
  }
}
