import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.CLEANUP },
    ),
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
