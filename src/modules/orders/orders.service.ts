import { Injectable, Inject, Logger } from '@nestjs/common';
import { OrdersRepository, OrderRow } from './orders.repository.js';
import { NotFoundError, ForbiddenError } from '../../common/errors/errors.js';
import type { PaymentProvider } from '../payments/payment-provider.interface.js';
import { PaymentsService } from '../payments/payments.service.js';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService');

  constructor(
    private readonly repo: OrdersRepository,
    @Inject('PaymentProvider')
    private readonly paymentProvider: PaymentProvider,
    private readonly paymentsService: PaymentsService,
  ) {}

  async findByIdOrThrow(id: string, userId: string): Promise<OrderRow> {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundError('Order', id);
    if (order.userId !== userId) throw new NotFoundError('Order', id);
    return order;
  }

  async list(
    userId: string,
    opts: {
      eventId?: string;
      orderType?: string;
      cursor?: string;
      limit: number;
    },
  ) {
    const rows = await this.repo.findByUser(userId, opts);
    const hasMore = rows.length > opts.limit;
    const data = hasMore ? rows.slice(0, opts.limit) : rows;
    const nextCursor = hasMore
      ? data[data.length - 1].createdAt.toISOString()
      : null;
    return { data, nextCursor };
  }

  async getDetail(orderId: string, userId: string) {
    let order = await this.findByIdOrThrow(orderId, userId);
    order = await this.tryReconcilePayment(order, userId);
    const items = await this.repo.findItemsByOrder(orderId);
    return {
      order: {
        ...order,
        items,
        tracking: order.trackingNumber
          ? {
              carrier: order.trackingCarrier,
              number: order.trackingNumber,
              url: order.trackingUrl,
            }
          : null,
      },
    };
  }

  async refund(
    orderId: string,
    userId: string,
    amountCents?: number,
    reason?: string,
  ) {
    const order = await this.findByIdOrThrow(orderId, userId);
    this.assertRefundable(order);

    const refundResult = await this.paymentProvider.refund(
      order.paymentProviderId!,
      amountCents,
      reason,
    );

    return this.repo.update(orderId, {
      status: 'refunded',
      refundedAt: new Date(),
      refundAmountCents: refundResult.amountCents,
      refundReason: reason,
    });
  }

  private async tryReconcilePayment(
    order: OrderRow,
    userId: string,
  ): Promise<OrderRow> {
    if (order.status !== 'pending' || !order.paymentProviderId) return order;
    try {
      const confirmed = await this.paymentsService.confirmOrderPayment(
        order.id,
      );
      if (confirmed) return this.findByIdOrThrow(order.id, userId);
    } catch (err) {
      this.logger.warn(
        { orderId: order.id, error: (err as Error).message },
        'Order payment confirmation failed',
      );
    }
    return order;
  }

  private assertRefundable(order: OrderRow): void {
    if (order.status !== 'paid' && order.status !== 'delivered') {
      throw new ForbiddenError(
        'Order cannot be refunded in its current status',
        'orders:cannot_refund_status',
      );
    }
    if (order.orderType === 'plan') {
      const daysSincePurchase = order.paymentCompletedAt
        ? Math.floor(
            (Date.now() - order.paymentCompletedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
      if (daysSincePurchase > 30) {
        throw new ForbiddenError(
          'Outside 30-day refund window',
          'orders:outside_refund_window',
        );
      }
    }
    if (!order.paymentProviderId) {
      throw new ForbiddenError(
        'No payment provider ID found',
        'orders:no_payment_provider_id',
      );
    }
  }
}
