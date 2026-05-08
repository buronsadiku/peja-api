import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { webhooksLog, orders, events } from '../../database/schema/index.js';
import type {
  PaymentProvider,
  ParsedWebhookEvent,
} from '../payments/payment-provider.interface.js';
import { PaymentsService } from '../payments/payments.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { jobOptions } from '../queue/queue.utils.js';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('WebhooksService');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    @Inject('PaymentProvider')
    private readonly paymentProvider: PaymentProvider,
    private readonly paymentsService: PaymentsService,
    private readonly subscriptionsService: SubscriptionsService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async processWebhook(
    provider: string,
    rawBody: Buffer,
    signatureHeader: string,
  ) {
    // 1. Verify signature
    if (
      !this.paymentProvider.verifyWebhookSignature(rawBody, signatureHeader)
    ) {
      this.logger.warn({ provider }, 'Webhook signature verification failed');
      return;
    }

    // 2. Parse event
    const event = this.paymentProvider.parseWebhookEvent(rawBody);
    this.logger.log(
      {
        provider,
        eventType: event.eventType,
        providerEventId: event.providerEventId,
      },
      'Webhook received',
    );

    // 3. Check for duplicate
    const existing = await this.db
      .select()
      .from(webhooksLog)
      .where(
        and(
          eq(webhooksLog.provider, provider),
          eq(webhooksLog.providerEventId, event.providerEventId),
        ),
      )
      .limit(1);

    if (existing[0]?.processedAt) {
      this.logger.log(
        { providerEventId: event.providerEventId },
        'Webhook already processed — skipping',
      );
      return;
    }

    // 4. Log the webhook
    const [logEntry] = await this.db
      .insert(webhooksLog)
      .values({
        provider,
        eventType: event.eventType,
        providerEventId: event.providerEventId,
        payload: rawBody.toString(),
      })
      .onConflictDoNothing()
      .returning();

    const logId = logEntry?.id || existing[0]?.id;

    // 5. Process
    try {
      switch (event.eventType) {
        case 'checkout.completed':
        case 'payment.succeeded':
          await this.processPaymentSuccess(event);
          break;
        case 'payment.failed':
          await this.processPaymentFailure(event);
          break;
        case 'refund.completed':
          await this.processRefundCompleted(event);
          break;
        default:
          this.logger.log(
            { eventType: event.eventType },
            'Unhandled webhook event type',
          );
      }

      if (logId) {
        await this.db
          .update(webhooksLog)
          .set({ processedAt: new Date() })
          .where(eq(webhooksLog.id, logId));
      }
    } catch (err) {
      this.logger.error(
        { logId, error: (err as Error).message },
        'Webhook processing failed',
      );
      if (logId) {
        await this.db
          .update(webhooksLog)
          .set({ processingError: (err as Error).message })
          .where(eq(webhooksLog.id, logId));
      }
    }
  }

  private async processPaymentSuccess(event: ParsedWebhookEvent) {
    if (!event.orderId) {
      this.logger.warn('Payment success webhook missing orderId');
      return;
    }

    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, event.orderId))
      .limit(1);
    if (!order) {
      this.logger.warn(
        { orderId: event.orderId },
        'Order not found for payment success',
      );
      return;
    }

    if (order.status === 'paid') {
      this.logger.log({ orderId: order.id }, 'Order already paid — skipping');
      return;
    }

    // Update order to paid
    await this.db
      .update(orders)
      .set({
        status: 'paid',
        paymentCompletedAt: new Date(),
        paymentProviderId: event.providerOrderId,
      })
      .where(eq(orders.id, order.id));

    // Activate plan if applicable
    if (order.orderType === 'plan') {
      await this.paymentsService.activatePlan(order.id);
    }

    // Send purchase confirmation email
    await this.emailQueue.add(
      JOB_NAMES.SEND_PURCHASE_CONFIRMATION,
      { orderId: order.id },
      jobOptions(),
    );

    this.logger.log(
      { orderId: order.id, type: order.orderType },
      'Payment processed successfully',
    );
  }

  private async processPaymentFailure(event: ParsedWebhookEvent) {
    if (!event.orderId) return;

    await this.db
      .update(orders)
      .set({ status: 'failed' })
      .where(eq(orders.id, event.orderId));
    this.logger.log({ orderId: event.orderId }, 'Payment marked as failed');
  }

  private async processRefundCompleted(event: ParsedWebhookEvent) {
    if (!event.orderId) return;

    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, event.orderId))
      .limit(1);
    if (!order) return;

    await this.db
      .update(orders)
      .set({
        status: 'refunded',
        refundedAt: new Date(),
        refundAmountCents: event.amountCents,
      })
      .where(eq(orders.id, order.id));

    // Revoke plan if applicable
    if (order.orderType === 'plan') {
      await this.subscriptionsService.revokeByEvent(order.eventId);
      const gracePeriod = new Date();
      gracePeriod.setDate(gracePeriod.getDate() + 7);
      await this.db
        .update(events)
        .set({
          planTier: null,
          status: 'archived',
          storageExpiresAt: gracePeriod,
        })
        .where(eq(events.id, order.eventId));
    }

    this.logger.log({ orderId: order.id }, 'Refund processed');
  }
}
