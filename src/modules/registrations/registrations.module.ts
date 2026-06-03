import { Module } from '@nestjs/common';
import { RegistrationsController } from './registrations.controller.js';
import { RegistrationsInternalController } from './registrations.internal.controller.js';
import { RegistrationsService } from './registrations.service.js';

@Module({
  controllers: [RegistrationsController, RegistrationsInternalController],
  providers: [RegistrationsService],
})
export class RegistrationsModule {}
