import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { getEnv } from '../../../config/env.js';
import { ServiceUnavailableError } from '../../../common/errors/errors.js';
import type {
  PaymentProvider,
  CheckoutParams,
  ParsedWebhookEvent,
  RefundResult,
  OrderStatusResult,
} from '../payment-provider.interface.js';

interface StripeWebhookObject {
  id?: string;
  payment_intent?: string;
  amount_total?: number;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
}

interface StripeWebhookBody {
  id?: string;
  type?: string;
  data?: {
    object?: StripeWebhookObject;
  };
}

@Injectable()
export class StripeAdapter implements PaymentProvider {
  readonly name = 'stripe';
  private readonly logger = new Logger('StripeAdapter');
  private client: InstanceType<typeof Stripe> | null = null;
  private webhookSecret: string = '';

  constructor() {
    const env = getEnv();
    if (env.STRIPE_SECRET_KEY) {
      this.client = new Stripe(env.STRIPE_SECRET_KEY);
      this.webhookSecret = env.STRIPE_WEBHOOK_SECRET || '';
      this.logger.log('Stripe adapter initialized');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set — payments disabled');
    }
  }

  async createCheckoutSession(
    params: CheckoutParams,
  ): Promise<{ sessionId: string; sessionUrl: string }> {
    if (!this.client)
      throw new ServiceUnavailableError(
        'Stripe not configured',
        'errors:service_unavailable',
      );

    const env = getEnv();
    const priceMap: Record<string, string | undefined> = {
      essentials: env.STRIPE_PRICE_ID_ESSENTIALS,
      premium: env.STRIPE_PRICE_ID_PREMIUM,
      bundle: env.STRIPE_PRICE_ID_BUNDLE,
    };

    const planTier = params.metadata.planTier;
    const priceId = planTier ? priceMap[planTier] : undefined;

    let lineItems: Array<{
      price?: string;
      quantity: number;
      price_data?: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
    }>;

    if (priceId) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else {
      lineItems = params.lineItems.map((item) =>
        item.stripePriceId
          ? { price: item.stripePriceId, quantity: item.quantity }
          : {
              price_data: {
                currency: params.currency.toLowerCase(),
                product_data: {
                  name: item.name,
                  description: item.description,
                },
                unit_amount: item.unitAmountCents,
              },
              quantity: item.quantity,
            },
      );
    }

    const session = await this.client.checkout.sessions.create({
      mode: 'payment' as const,
      line_items: lineItems,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      customer_email: params.customerEmail || undefined,
      metadata: { orderId: params.orderId, ...params.metadata },
    });

    return {
      sessionId: session.id,
      sessionUrl: session.url || '',
    };
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader: string,
  ): boolean {
    if (!this.client || !this.webhookSecret) return false;
    try {
      this.client.webhooks.constructEvent(
        rawBody,
        signatureHeader,
        this.webhookSecret,
      );
      return true;
    } catch {
      return false;
    }
  }

  parseWebhookEvent(rawBody: string | Buffer): ParsedWebhookEvent {
    const body = JSON.parse(rawBody.toString()) as StripeWebhookBody;
    const eventType = body.type || 'unknown';

    let mappedType: ParsedWebhookEvent['eventType'] = 'unknown';
    if (eventType === 'checkout.session.completed')
      mappedType = 'checkout.completed';
    if (eventType === 'payment_intent.payment_failed')
      mappedType = 'payment.failed';
    if (eventType === 'charge.refunded') mappedType = 'refund.completed';

    const data = body.data?.object ?? {};
    const metadata = data.metadata ?? {};

    return {
      providerEventId: body.id || '',
      eventType: mappedType,
      orderId: metadata.orderId || null,
      providerOrderId: data.payment_intent || data.id || '',
      amountCents: data.amount_total || data.amount || 0,
      currency: (data.currency || 'eur').toUpperCase(),
      raw: body,
    };
  }

  async refund(
    providerOrderId: string,
    amountCents?: number,
    reason?: string,
  ): Promise<RefundResult> {
    if (!this.client)
      throw new ServiceUnavailableError(
        'Stripe not configured',
        'errors:service_unavailable',
      );

    const refund = await this.client.refunds.create({
      payment_intent: providerOrderId,
      amount: amountCents || undefined,
      reason:
        reason === 'customer_request'
          ? 'requested_by_customer'
          : 'requested_by_customer',
    });

    return {
      refundId: refund.id,
      amountCents: refund.amount,
      status:
        refund.status === 'succeeded'
          ? 'succeeded'
          : refund.status === 'pending'
            ? 'pending'
            : 'failed',
    };
  }

  async getCheckoutSessionStatus(
    sessionId: string,
  ): Promise<{ paid: boolean; paymentIntentId: string | null }> {
    if (!this.client)
      throw new ServiceUnavailableError(
        'Stripe not configured',
        'errors:service_unavailable',
      );

    const session = await this.client.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid';
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);
    return { paid, paymentIntentId };
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatusResult> {
    if (!this.client)
      throw new ServiceUnavailableError(
        'Stripe not configured',
        'errors:service_unavailable',
      );

    const pi = await this.client.paymentIntents.retrieve(providerOrderId);

    const statusMap: Record<string, OrderStatusResult['status']> = {
      succeeded: 'paid',
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      processing: 'pending',
      canceled: 'failed',
    };

    return {
      status: statusMap[pi.status] || 'pending',
      amountCents: pi.amount,
      paidAt: pi.status === 'succeeded' ? new Date(pi.created * 1000) : null,
    };
  }
}
