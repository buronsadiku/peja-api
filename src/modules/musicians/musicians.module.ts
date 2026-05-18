import { Module } from '@nestjs/common';
import { MusiciansController } from './musicians.controller.js';
import { MusiciansService } from './musicians.service.js';

@Module({
  controllers: [MusiciansController],
  providers: [MusiciansService],
  exports: [MusiciansService],
})
export class MusiciansModule {}
