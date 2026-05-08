import { Module } from '@nestjs/common';
import { MessagesRepository } from './messages.repository.js';
import { MessagesService } from './messages.service.js';
import { MessagesController } from './messages.controller.js';
import { EventsModule } from '../events/events.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { MediaModule } from '../media/media.module.js';

@Module({
  imports: [EventsModule, QueueModule, MediaModule],
  controllers: [MessagesController],
  providers: [MessagesRepository, MessagesService],
  exports: [MessagesRepository, MessagesService],
})
export class MessagesModule {}
