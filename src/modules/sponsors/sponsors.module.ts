import { Module } from '@nestjs/common';
import { SponsorsController } from './sponsors.controller.js';
import { SponsorsService } from './sponsors.service.js';

@Module({
  controllers: [SponsorsController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
