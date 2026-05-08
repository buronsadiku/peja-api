import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SUPPORTED_LANGUAGES, EVENT_STATUSES } from '../../common/constants.js';

export const createEventSchema = z
  .object({
    partnerAName: z.string().min(1).max(50),
    partnerBName: z.string().min(1).max(50),
    weddingDate: z.string().optional(),
    venueName: z.string().max(100).optional(),
    venueCity: z.string().max(100).optional(),
    expectedGuests: z.number().int().min(1).max(10000).optional(),
  })
  .strict();

export class CreateEventDto extends createZodDto(createEventSchema) {}

export const updateEventSchema = z
  .object({
    partnerAName: z.string().min(1).max(50).optional(),
    partnerBName: z.string().min(1).max(50).optional(),
    weddingDate: z.string().optional(),
    venueName: z.string().max(100).optional(),
    venueCity: z.string().max(100).optional(),
    expectedGuests: z.number().int().min(1).max(10000).optional(),
    welcomeMessage: z.string().max(200).optional(),
    themeColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    couplePhotoUrl: z.string().url().optional(),
    defaultLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
    slug: z
      .string()
      .min(4)
      .max(20)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    kioskPin: z
      .string()
      .length(4)
      .regex(/^\d{4}$/)
      .optional(),
    submissionsEnabled: z.boolean().optional(),
    status: z.enum(EVENT_STATUSES).optional(),
  })
  .strict();

export class UpdateEventDto extends createZodDto(updateEventSchema) {}

export const listEventsQuerySchema = z
  .object({
    status: z.enum(EVENT_STATUSES).optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const coverUploadUrlSchema = z
  .object({
    contentType: z.enum([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
    ]),
  })
  .strict();

export class CoverUploadUrlDto extends createZodDto(coverUploadUrlSchema) {}
