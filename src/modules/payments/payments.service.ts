import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { orders, orderItems, events } from '../../database/schema/index.js';
import { EventsService } from '../events/events.service.js';
import { PlansService } from '../plans/plans.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { ProductsRepository } from '../keepsakes/products.repository.js';
import { CustomizationValidatorService } from '../keepsakes/customization-validator.service.js';
import { VendorsService } from '../vendors/vendors.service.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import { CreditsService } from '../credits/credits.service.js';
import {
  PaymentFailedError,
  ValidationError,
} from '../../common/errors/errors.js';
import type { PaymentProvider } from './payment-provider.interface.js';
import type { CheckoutSessionDto } from './payments.schemas.js';

interface OrderMetadata {
  planTier?: string;
  planId?: string;
  creditAppliedCents?: number;
  promoCode?: string;
  promotionId?: string;
  promoDiscountCents?: number;
}

interface ResolvedItem {
  productId: string | null;
  productVariantId: string | null;
  productSku: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  customization: Record<string, unknown>;
  productType: string | null;
  stripePriceId: string | null;
}

interface LineItem {
  name: string;
  description?: string;
  unitAmountCents: number;
  quantity: number;
  stripePriceId?: string;
}

interface CheckoutContext {
  totalCents: number;
  planId: string | null;
  lineItems: LineItem[];
  creditAppliedCents: number;
  resolvedItems: ResolvedItem[];
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('PaymentsService');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    @Inject('PaymentProvider')
    private readonly paymentProvider: PaymentProvider,
    private readonly eventsService: EventsService,
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly productsRepo: ProductsRepository,
    private readonly customizationValidator: CustomizationValidatorService,
    private readonly vendorsService: VendorsService,
    private readonly promotionsService: PromotionsService,
    private readonly creditsService: CreditsService,
  ) {}

  async createCheckoutSession(userId: string, dto: CheckoutSessionDto) {
    await this.eventsService.verifyOwnership(dto.eventId, userId);

    const checkout =
      dto.orderType === 'plan'
        ? await this.buildPlanCheckout(dto)
        : await this.buildKeepsakeCheckout(dto, userId);

    const [order] = await this.db
      .insert(orders)
      .values({
        eventId: dto.eventId,
        userId,
        orderType: dto.orderType,
        subtotalCents: checkout.totalCents,
        totalCents: checkout.totalCents,
        metadata: {
          planTier: dto.planTier,
          planId: checkout.planId ?? undefined,
          creditAppliedCents: checkout.creditAppliedCents,
        } satisfies OrderMetadata,
      })
      .returning();

    if (dto.orderType === 'keepsake' && checkout.resolvedItems.length > 0) {
      const region = this.vendorsService.countryToRegion(
        dto.shippingAddress?.country ?? null,
      );
      await this.insertOrderItems(order.id, checkout.resolvedItems, region);
    }

    let { totalCents, lineItems } = checkout;

    if (dto.orderType === 'keepsake' && dto.promoCode && totalCents > 0) {
      const initialMetadata: OrderMetadata = {
        planTier: dto.planTier,
        planId: checkout.planId ?? undefined,
        creditAppliedCents: checkout.creditAppliedCents,
      };
      ({ totalCents, lineItems } = await this.applyPromoCode(
        order.id,
        dto.promoCode,
        totalCents,
        initialMetadata,
        lineItems,
      ));
    }

    const successUrl = dto.successUrl.replace(
      '{CHECKOUT_SESSION_ID}',
      order.id,
    );
    const cancelUrl = dto.cancelUrl.replace('{CHECKOUT_SESSION_ID}', order.id);

    if (totalCents === 0) {
      return this.completeFreeOrder(order.id, dto.orderType, successUrl);
    }

    return this.createProviderSession(
      order.id,
      lineItems,
      dto,
      successUrl,
      cancelUrl,
    );
  }

  async confirmOrderPayment(orderId: string): Promise<boolean> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return false;
    if (order.status === 'paid') return true;
    if (!order.paymentProviderId) return false;

    const status = await this.paymentProvider.getCheckoutSessionStatus(
      order.paymentProviderId,
    );
    if (!status.paid) return false;

    await this.db
      .update(orders)
      .set({
        status: 'paid',
        paymentCompletedAt: new Date(),
        paymentProviderId: status.paymentIntentId ?? order.paymentProviderId,
      })
      .where(eq(orders.id, order.id));

    if (order.orderType === 'plan') {
      await this.activatePlan(order.id);
    }

    return true;
  }

  async activatePlan(orderId: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return;
    if (order.orderType !== 'plan') return;

    const metadata = order.metadata as OrderMetadata | null;
    const planCode = metadata?.planTier;
    if (!planCode) return;

    const plan = await this.plansService.findByCode(planCode);
    if (!plan) {
      this.logger.warn({ orderId, planCode }, 'Plan not found on activation');
      return;
    }

    await this.subscriptionsService.activate({
      eventId: order.eventId,
      userId: order.userId,
      planId: plan.id,
      orderId: order.id,
      creditCents: plan.creditCents,
      storageDays: plan.storageDays,
    });

    if (plan.creditCents > 0) {
      await this.creditsService.grant({
        eventId: order.eventId,
        userId: order.userId,
        orderId: order.id,
        amountCents: plan.creditCents,
        reason: `plan_grant:${plan.code}`,
      });
    }

    await this.db
      .update(events)
      .set({
        planTier: plan.code,
        planPurchasedAt: new Date(),
        status: 'active',
        messageLimit: plan.messageLimit,
        storageExpiresAt: this.computeStorageExpiry(plan.storageDays),
      })
      .where(eq(events.id, order.eventId));
  }

  private async buildPlanCheckout(
    dto: CheckoutSessionDto,
  ): Promise<CheckoutContext> {
    if (!dto.planTier) {
      throw new ValidationError({ planTier: 'required for plan checkout' });
    }
    const plan = await this.plansService.findByCode(dto.planTier);
    if (!plan) {
      throw new ValidationError({ planTier: `unknown plan: ${dto.planTier}` });
    }
    return {
      totalCents: plan.priceCents,
      planId: plan.id,
      lineItems: [
        {
          name: plan.name,
          description: plan.description ?? undefined,
          unitAmountCents: plan.priceCents,
          quantity: 1,
        },
      ],
      creditAppliedCents: 0,
      resolvedItems: [],
    };
  }

  private async buildKeepsakeCheckout(
    dto: CheckoutSessionDto,
    userId: string,
  ): Promise<CheckoutContext> {
    const resolvedItems = await this.resolveKeepsakeItems(dto.items ?? []);
    const itemSubtotal = resolvedItems.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );

    const credit = await this.creditsService.redeemUpToBalance({
      eventId: dto.eventId,
      userId,
      amountCents: itemSubtotal,
      reason: 'keepsake_checkout',
    });
    const creditAppliedCents = credit.applied;
    if (creditAppliedCents > 0) {
      await this.subscriptionsService.deductCredits(
        dto.eventId,
        creditAppliedCents,
      );
    }
    const totalCents = Math.max(0, itemSubtotal - creditAppliedCents);

    const lineItems: LineItem[] = resolvedItems.map((item) => ({
      name: item.productName,
      unitAmountCents: item.unitPriceCents,
      quantity: item.quantity,
      stripePriceId: item.stripePriceId ?? undefined,
    }));
    if (creditAppliedCents > 0 && totalCents > 0) {
      lineItems.push({
        name: 'Plan credit applied',
        unitAmountCents: -creditAppliedCents,
        quantity: 1,
      });
    }

    return {
      totalCents,
      planId: null,
      lineItems,
      creditAppliedCents,
      resolvedItems,
    };
  }

  private async insertOrderItems(
    orderId: string,
    resolvedItems: ResolvedItem[],
    region: string,
  ): Promise<void> {
    const itemsWithVendors = await Promise.all(
      resolvedItems.map(async (item) => {
        const resolved = item.productId
          ? await this.vendorsService.resolveVendor(item.productId, region)
          : undefined;
        return {
          orderId,
          productId: item.productId,
          productVariantId: item.productVariantId,
          productSku: item.productSku,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          customization: item.customization,
          vendorId: resolved?.vendor.id ?? null,
        };
      }),
    );
    await this.db.insert(orderItems).values(itemsWithVendors);
  }

  private async applyPromoCode(
    orderId: string,
    promoCode: string,
    totalCents: number,
    metadata: OrderMetadata,
    currentLineItems: LineItem[],
  ): Promise<{ totalCents: number; lineItems: LineItem[] }> {
    try {
      const applied = await this.promotionsService.validateAndApply(
        orderId,
        promoCode,
        totalCents,
      );
      const newTotal = Math.max(0, totalCents - applied.discountCents);
      await this.db
        .update(orders)
        .set({
          totalCents: newTotal,
          metadata: {
            ...metadata,
            promoCode,
            promotionId: applied.promotionId,
            promoDiscountCents: applied.discountCents,
          } satisfies OrderMetadata,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      const lineItems = [...currentLineItems];
      if (applied.discountCents > 0) {
        lineItems.push({
          name: `Promo: ${promoCode}`,
          unitAmountCents: -applied.discountCents,
          quantity: 1,
        });
      }
      return { totalCents: newTotal, lineItems };
    } catch (err) {
      this.logger.warn(
        { orderId, code: promoCode, error: (err as Error).message },
        'Promo application failed',
      );
      throw err;
    }
  }

  private async completeFreeOrder(
    orderId: string,
    orderType: string,
    successUrl: string,
  ) {
    await this.db
      .update(orders)
      .set({ status: 'paid', paymentCompletedAt: new Date() })
      .where(eq(orders.id, orderId));
    if (orderType === 'plan') {
      await this.activatePlan(orderId);
    }
    return { orderId, checkoutUrl: successUrl, providerSessionId: 'free' };
  }

  private async createProviderSession(
    orderId: string,
    lineItems: LineItem[],
    dto: CheckoutSessionDto,
    successUrl: string,
    cancelUrl: string,
  ) {
    try {
      const session = await this.paymentProvider.createCheckoutSession({
        orderId,
        customerEmail: '',
        currency: 'EUR',
        lineItems,
        successUrl,
        cancelUrl,
        metadata: { planTier: dto.planTier || '', eventId: dto.eventId },
      });
      await this.db
        .update(orders)
        .set({
          paymentProvider: this.paymentProvider.name,
          paymentProviderId: session.sessionId,
        })
        .where(eq(orders.id, orderId));
      return {
        orderId,
        checkoutUrl: session.sessionUrl,
        providerSessionId: session.sessionId,
      };
    } catch (err) {
      this.logger.error(
        { orderId, error: (err as Error).message },
        'Checkout creation failed',
      );
      throw new PaymentFailedError(
        'Failed to create checkout session',
        'payments:checkout_failed',
      );
    }
  }

  private computeStorageExpiry(storageDays: number | null): Date | null {
    if (storageDays === null) return null;
    const expires = new Date();
    expires.setDate(expires.getDate() + storageDays);
    return expires;
  }

  private async resolveProductAndVariant(item: {
    productSku: string;
    productVariantId?: string;
  }) {
    const product = await this.productsRepo.findBySku(item.productSku);
    if (!product) {
      throw new ValidationError({
        productSku: `unknown product: ${item.productSku}`,
      });
    }
    if (!item.productVariantId) {
      return {
        product,
        variantId: null,
        variantSku: product.sku,
        variantName: product.name,
        variantPriceCents: product.basePriceCents,
      };
    }
    const variant = await this.productsRepo.findVariantById(
      item.productVariantId,
    );
    if (!variant || variant.productId !== product.id) {
      throw new ValidationError({
        productVariantId: `invalid variant for ${item.productSku}`,
      });
    }
    return {
      product,
      variantId: variant.id,
      variantSku: variant.sku,
      variantName: `${product.name} — ${variant.name}`,
      variantPriceCents: variant.priceCents ?? product.basePriceCents,
    };
  }

  private async resolveKeepsakeItems(
    items: Array<{
      productSku: string;
      productVariantId?: string;
      quantity: number;
      customization?: Record<string, unknown>;
    }>,
  ): Promise<ResolvedItem[]> {
    return Promise.all(
      items.map(async (item) => {
        const {
          product,
          variantId,
          variantSku,
          variantName,
          variantPriceCents,
        } = await this.resolveProductAndVariant(item);
        const customization = item.customization ?? {};
        await this.customizationValidator.validate(
          product.productType,
          customization,
        );
        return {
          productId: product.id,
          productVariantId: variantId,
          productSku: variantSku,
          productName: variantName,
          unitPriceCents: variantPriceCents,
          quantity: item.quantity,
          customization,
          productType: product.productType,
          stripePriceId: product.stripePriceId,
        };
      }),
    );
  }
}
