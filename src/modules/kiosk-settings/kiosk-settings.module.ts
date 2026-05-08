import { Module } from '@nestjs/common';
import { KioskSettingsController } from './kiosk-settings.controller.js';
import { KioskSettingsService } from './kiosk-settings.service.js';
import { KioskSettingsRepository } from './kiosk-settings.repository.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [EventsModule],
  controllers: [KioskSettingsController],
  providers: [KioskSettingsService, KioskSettingsRepository],
  exports: [KioskSettingsService],
})
export class KioskSettingsModule {}
