import { Injectable, Logger } from '@nestjs/common';
import {
  SubscriptionsRepository,
  SubscriptionRow,
} from './subscriptions.repository.js';
import { PlansService } from '../plans/plans.service.js';

export interface ActivateInput {
  eventId: string;
  userId: string;
  planId: string;
  orderId: string | null;
  creditCents: number;
  storageDays: number | null;
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger('SubscriptionsService');

  constructor(
    private readonly repo: SubscriptionsRepository,
    private readonly plansService: PlansService,
  ) {}

  async findActiveByEvent(
    eventId: string,
  ): Promise<SubscriptionRow | undefined> {
    return this.repo.findActiveByEvent(eventId);
  }

  async activate(input: ActivateInput): Promise<SubscriptionRow> {
    await this.repo.cancelByEvent(input.eventId);

    const expiresAt =
      input.storageDays === null
        ? null
        : new Date(Date.now() + input.storageDays * 24 * 60 * 60 * 1000);

    const sub = await this.repo.create({
      eventId: input.eventId,
      userId: input.userId,
      planId: input.planId,
      orderId: input.orderId,
      status: 'active',
      creditCentsRemaining: input.creditCents,
      activatedAt: new Date(),
      expiresAt,
    });

    this.logger.log(
      { subscriptionId: sub.id, eventId: input.eventId, planId: input.planId },
      'Subscription activated',
    );
    return sub;
  }

  async deductCredits(
    eventId: string,
    amountCents: number,
  ): Promise<{ applied: number; remainingCents: number } | null> {
    const sub = await this.repo.findActiveByEvent(eventId);
    if (!sub || sub.creditCentsRemaining <= 0) return null;

    const applied = Math.min(sub.creditCentsRemaining, amountCents);
    const updated = await this.repo.deductCredits(sub.id, applied);
    return {
      applied,
      remainingCents: updated?.creditCentsRemaining ?? 0,
    };
  }

  async revokeByEvent(eventId: string): Promise<void> {
    await this.repo.cancelByEvent(eventId);
  }
}
