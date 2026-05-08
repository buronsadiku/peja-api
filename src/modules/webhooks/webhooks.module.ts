import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

@Module({
  imports: [
    PaymentsModule,
    SubscriptionsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
