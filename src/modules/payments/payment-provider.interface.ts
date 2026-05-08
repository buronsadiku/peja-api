export interface CheckoutParams {
  orderId: string;
  customerEmail: string;
  currency: string;
  lineItems: Array<{
    name: string;
    description?: string;
    unitAmountCents: number;
    quantity: number;
    stripePriceId?: string;
  }>;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}

export interface ParsedWebhookEvent {
  providerEventId: string;
  eventType:
    | 'checkout.completed'
    | 'payment.succeeded'
    | 'payment.failed'
    | 'refund.completed'
    | 'unknown';
  orderId: string | null;
  providerOrderId: string;
  amountCents: number;
  currency: string;
  raw: unknown;
}

export interface RefundResult {
  refundId: string;
  amountCents: number;
  status: 'succeeded' | 'pending' | 'failed';
}

export interface OrderStatusResult {
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amountCents: number;
  paidAt: Date | null;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(
    params: CheckoutParams,
  ): Promise<{ sessionId: string; sessionUrl: string }>;
  verifyWebhookSignature(
    rawBody: string | Buffer,
    signatureHeader: string,
  ): boolean;
  parseWebhookEvent(rawBody: string | Buffer): ParsedWebhookEvent;
  refund(
    providerOrderId: string,
    amountCents?: number,
    reason?: string,
  ): Promise<RefundResult>;
  getOrderStatus(providerOrderId: string): Promise<OrderStatusResult>;
  getCheckoutSessionStatus(
    sessionId: string,
  ): Promise<{ paid: boolean; paymentIntentId: string | null }>;
}
