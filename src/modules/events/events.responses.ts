import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const eventSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  slug: z.string(),
  partnerAName: z.string(),
  partnerBName: z.string(),
  weddingDate: z.string().nullable(),
  venueName: z.string().nullable(),
  venueCity: z.string().nullable(),
  expectedGuests: z.number().nullable(),
  welcomeMessage: z.string().nullable(),
  themeColor: z.string(),
  couplePhotoUrl: z.string().nullable(),
  planTier: z.string().nullable(),
  messageLimit: z.number().nullable(),
  status: z.string(),
  defaultLanguage: z.string(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export class EventDto extends createZodDto(eventSchema) {}

export class EventWrapperDto {
  @ApiProperty({ type: EventDto })
  event!: EventDto;
}

const qrCodeResultSchema = z.object({
  qrData: z.string(),
  shortUrl: z.string(),
  format: z.enum(['png', 'svg']),
});

export class QrCodeResultDto extends createZodDto(qrCodeResultSchema) {}

const eventStatsSchema = z.object({
  totalMessages: z.number(),
  audioMessages: z.number(),
  videoCount: z.number(),
  photoCount: z.number(),
  writtenMessages: z.number(),
  favorites: z.number(),
});

export class EventStatsDto extends createZodDto(eventStatsSchema) {}

const coverUploadResultSchema = z.object({
  uploadUrl: z.string().url(),
  publicUrl: z.string().url(),
  key: z.string(),
  maxSizeBytes: z.number(),
});

export class CoverUploadResultDto extends createZodDto(
  coverUploadResultSchema,
) {}
