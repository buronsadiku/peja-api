import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { StripeAdapter } from './adapters/stripe.adapter.js';
import { EventsModule } from '../events/events.module.js';
import { PlansModule } from '../plans/plans.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { KeepsakesModule } from '../keepsakes/keepsakes.module.js';
import { VendorsModule } from '../vendors/vendors.module.js';
import { PromotionsModule } from '../promotions/promotions.module.js';
import { CreditsModule } from '../credits/credits.module.js';

@Module({
  imports: [
    EventsModule,
    PlansModule,
    SubscriptionsModule,
    KeepsakesModule,
    VendorsModule,
    PromotionsModule,
    CreditsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    StripeAdapter,
    {
      provide: 'PaymentProvider',
      useExisting: StripeAdapter,
    },
  ],
  exports: [PaymentsService, StripeAdapter, 'PaymentProvider'],
})
export class PaymentsModule {}
