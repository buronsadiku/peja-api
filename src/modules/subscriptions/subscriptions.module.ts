import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsRepository } from './subscriptions.repository.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { PlansModule } from '../plans/plans.module.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [PlansModule, EventsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsRepository],
  exports: [SubscriptionsService, SubscriptionsRepository],
})
export class SubscriptionsModule {}
