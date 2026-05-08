import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcryptjs from 'bcryptjs';
import { EventsRepository, EventRow } from './events.repository.js';
import { NotFoundError } from '../../common/errors/errors.js';
import { getEnv } from '../../config/env.js';
import type { CreateEventDto, UpdateEventDto } from './events.schemas.js';

@Injectable()
export class EventsService {
  constructor(private readonly repo: EventsRepository) {}

  async findByIdOrThrow(id: string): Promise<EventRow> {
    const event = await this.repo.findById(id);
    if (!event || event.deletedAt) throw new NotFoundError('Event', id);
    return event;
  }

  async verifyOwnership(eventId: string, userId: string): Promise<EventRow> {
    const event = await this.findByIdOrThrow(eventId);
    if (event.ownerUserId !== userId) throw new NotFoundError('Event', eventId);
    return event;
  }

  async create(ownerUserId: string, dto: CreateEventDto): Promise<EventRow> {
    const slug = this.generateSlug(dto.partnerAName, dto.partnerBName);
    return this.repo.create({
      ownerUserId,
      slug,
      partnerAName: dto.partnerAName,
      partnerBName: dto.partnerBName,
      weddingDate: dto.weddingDate,
      venueName: dto.venueName,
      venueCity: dto.venueCity,
      expectedGuests: dto.expectedGuests,
    });
  }

  async list(
    ownerUserId: string,
    opts: { status?: string; cursor?: string; limit: number },
  ) {
    const rows = await this.repo.findByOwner(ownerUserId, opts);
    const hasMore = rows.length > opts.limit;
    const data = hasMore ? rows.slice(0, opts.limit) : rows;
    const nextCursor = hasMore
      ? data[data.length - 1].createdAt.toISOString()
      : null;
    return { data, nextCursor };
  }

  async update(id: string, dto: UpdateEventDto): Promise<EventRow> {
    return this.repo.update(id, await this.normalizeUpdatePayload(dto));
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  async archive(id: string): Promise<EventRow> {
    return this.repo.update(id, { status: 'archived' });
  }

  async getStats(id: string) {
    const raw = await this.repo.getStats(id);
    return {
      totalMessages: Number(raw.messageCount),
      audioMessages: Number(raw.audioCount),
      videoCount: Number(raw.videoCount),
      photoCount: Number(raw.photoCount),
      writtenMessages: Number(raw.writtenCount),
      favorites: Number(raw.favoriteCount),
    };
  }

  async generateQrCode(
    eventId: string,
    format: 'png' | 'svg' = 'png',
    size: number = 512,
  ) {
    const event = await this.findByIdOrThrow(eventId);
    const guestUrl = this.buildGuestUrl(event);
    return this.renderQrCode(guestUrl, format, size);
  }

  private async normalizeUpdatePayload(
    dto: UpdateEventDto,
  ): Promise<Record<string, unknown>> {
    const updateData: Record<string, unknown> = { ...dto };
    if (dto.kioskPin) {
      updateData.kioskPinHash = await bcryptjs.hash(dto.kioskPin, 10);
      delete updateData.kioskPin;
    }
    if (dto.submissionsEnabled !== undefined) {
      updateData.status = dto.submissionsEnabled ? 'active' : 'paused';
      delete updateData.submissionsEnabled;
    }
    return updateData;
  }

  private buildGuestUrl(event: EventRow): string {
    return `${getEnv().FRONTEND_BASE_URL}/g/${event.slug}`;
  }

  private async renderQrCode(url: string, format: 'png' | 'svg', size: number) {
    const QRCode = await import('qrcode');
    if (format === 'svg') {
      const svg = await QRCode.toString(url, { type: 'svg', width: size });
      return { qrData: svg, format: 'svg' as const, shortUrl: url };
    }
    const pngBuffer = await QRCode.toBuffer(url, { width: size, type: 'png' });
    return { qrData: pngBuffer, format: 'png' as const, shortUrl: url };
  }

  private generateSlug(nameA: string, nameB: string): string {
    const base = `${nameA}-${nameB}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 12);
    const suffix = randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }
}
