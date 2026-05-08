import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PlansRepository, PlanRow } from './plans.repository.js';
import { getEnv } from '../../config/env.js';

const SEED_PLANS = [
  {
    code: 'essentials',
    name: 'Essential',
    description: 'Up to 50 messages. 30-day storage.',
    priceCents: 0,
    currency: 'EUR',
    messageLimit: 50,
    storageDays: 30,
    creditCents: 0,
    sortOrder: 1,
    envPriceKey: 'STRIPE_PRICE_ID_ESSENTIALS' as const,
  },
  {
    code: 'premium',
    name: 'Keepsake',
    description: 'Unlimited messages. 1-year storage.',
    priceCents: 18900,
    currency: 'EUR',
    messageLimit: null,
    storageDays: 365,
    creditCents: 0,
    sortOrder: 2,
    envPriceKey: 'STRIPE_PRICE_ID_PREMIUM' as const,
  },
  {
    code: 'bundle',
    name: 'Gold',
    description: 'Unlimited messages. Lifetime storage. €50 keepsake credit.',
    priceCents: 39900,
    currency: 'EUR',
    messageLimit: null,
    storageDays: null,
    creditCents: 5000,
    sortOrder: 3,
    envPriceKey: 'STRIPE_PRICE_ID_BUNDLE' as const,
  },
];

@Injectable()
export class PlansService implements OnModuleInit {
  private readonly logger = new Logger('PlansService');

  constructor(private readonly repo: PlansRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seed();
  }

  async seed(): Promise<void> {
    const env = getEnv();
    for (const plan of SEED_PLANS) {
      const stripePriceId = env[plan.envPriceKey] ?? null;
      const existing = await this.repo.findByCode(plan.code);
      if (!existing) {
        await this.repo.upsert({
          code: plan.code,
          name: plan.name,
          description: plan.description,
          priceCents: plan.priceCents,
          currency: plan.currency,
          stripePriceId,
          messageLimit: plan.messageLimit,
          storageDays: plan.storageDays,
          creditCents: plan.creditCents,
          sortOrder: plan.sortOrder,
        });
        this.logger.log({ code: plan.code }, 'Seeded plan');
      } else if (!existing.stripePriceId && stripePriceId) {
        await this.repo.setStripePriceId(plan.code, stripePriceId);
        this.logger.log(
          { code: plan.code },
          'Backfilled Stripe price ID on plan',
        );
      }
    }
  }

  findByCode(code: string): Promise<PlanRow | undefined> {
    return this.repo.findByCode(code);
  }

  findById(id: string): Promise<PlanRow | undefined> {
    return this.repo.findById(id);
  }

  listActive(): Promise<PlanRow[]> {
    return this.repo.listActive();
  }
}
