import { BadRequestException, Injectable } from '@nestjs/common';
import {
  KioskSettingsRepository,
  type KioskSettingsRow,
} from './kiosk-settings.repository.js';
import { EventsService } from '../events/events.service.js';
import type { UpdateKioskSettingsDto } from './kiosk-settings.schemas.js';

@Injectable()
export class KioskSettingsService {
  constructor(
    private readonly repo: KioskSettingsRepository,
    private readonly eventsService: EventsService,
  ) {}

  async getOrCreateForEvent(eventId: string): Promise<KioskSettingsRow> {
    const existing = await this.repo.findByEventId(eventId);
    if (existing) return existing;
    const event = await this.eventsService.findByIdOrThrow(eventId);
    return this.repo.createForEvent(eventId, {
      defaultLanguage: event.defaultLanguage,
      supportedLanguages: [event.defaultLanguage],
    });
  }

  async update(
    eventId: string,
    dto: UpdateKioskSettingsDto,
  ): Promise<KioskSettingsRow> {
    await this.getOrCreateForEvent(eventId);

    if (dto.supportedLanguages || dto.defaultLanguage) {
      const current = await this.repo.findByEventId(eventId);
      const nextSupported =
        dto.supportedLanguages ?? current!.supportedLanguages;
      const nextDefault = dto.defaultLanguage ?? current!.defaultLanguage;
      if (!nextSupported.includes(nextDefault)) {
        throw new BadRequestException(
          'defaultLanguage must be in supportedLanguages',
        );
      }
    }

    const updated = await this.repo.updateByEventId(eventId, dto);
    if (!updated) {
      throw new BadRequestException('Failed to update kiosk settings');
    }
    return updated;
  }
}
