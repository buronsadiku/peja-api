import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';
import { EventsModule } from '../events/events.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { MediaModule } from '../media/media.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { KioskSettingsModule } from '../kiosk-settings/kiosk-settings.module.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

@Module({
  imports: [
    EventsModule,
    MessagesModule,
    MediaModule,
    QueueModule,
    SubscriptionsModule,
    KioskSettingsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }),
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
