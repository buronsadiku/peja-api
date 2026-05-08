import { Module } from '@nestjs/common';
import { PlansService } from './plans.service.js';
import { PlansRepository } from './plans.repository.js';
import { PlansController } from './plans.controller.js';

@Module({
  controllers: [PlansController],
  providers: [PlansService, PlansRepository],
  exports: [PlansService, PlansRepository],
})
export class PlansModule {}
