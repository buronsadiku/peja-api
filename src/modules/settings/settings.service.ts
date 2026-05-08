import { Injectable } from '@nestjs/common';
import { SettingsRepository, SettingsRow } from './settings.repository.js';
import type { UpdateSettingsDto } from './settings.schemas.js';

@Injectable()
export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  async getOrCreate(eventId: string): Promise<SettingsRow> {
    const existing = await this.repo.findByEventId(eventId);
    if (existing) return existing;
    return this.repo.create({ eventId });
  }

  async update(eventId: string, dto: UpdateSettingsDto): Promise<SettingsRow> {
    await this.getOrCreate(eventId);
    return this.repo.update(eventId, dto);
  }
}
