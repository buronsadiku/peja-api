import { Injectable } from '@nestjs/common';
import { eq, and, desc, lt, type SQL } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { orders, orderItems } from '../../database/schema/index.js';

export type OrderRow = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;
export type OrderItemRow = typeof orderItems.$inferSelect;

@Injectable()
export class OrdersRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<OrderRow | undefined> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    return rows[0];
  }

  async findByUser(
    userId: string,
    opts: {
      eventId?: string;
      orderType?: string;
      cursor?: string;
      limit: number;
    },
  ): Promise<OrderRow[]> {
    const conditions: SQL[] = [eq(orders.userId, userId)];
    if (opts.eventId) conditions.push(eq(orders.eventId, opts.eventId));
    if (opts.orderType) conditions.push(eq(orders.orderType, opts.orderType));
    if (opts.cursor)
      conditions.push(lt(orders.createdAt, new Date(opts.cursor)));

    return this.db
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt))
      .limit(opts.limit + 1);
  }

  async findItemsByOrder(orderId: string): Promise<OrderItemRow[]> {
    return this.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async update(id: string, data: Partial<OrderInsert>): Promise<OrderRow> {
    const rows = await this.db
      .update(orders)
      .set(data)
      .where(eq(orders.id, id))
      .returning();
    return rows[0];
  }

  async findByPaymentProviderId(
    providerId: string,
  ): Promise<OrderRow | undefined> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.paymentProviderId, providerId))
      .limit(1);
    return rows[0];
  }
}
