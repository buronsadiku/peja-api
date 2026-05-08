import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const listMessagesQuerySchema = z
  .object({
    filter: z
      .enum(['all', 'favorites', 'with_photo', 'with_video', 'audio_only'])
      .default('all'),
    search: z.string().optional(),
    sort: z.enum(['newest', 'oldest', 'longest']).default('newest'),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    includeOwnerUploads: z
      .preprocess((v) => v === 'true' || v === true, z.boolean())
      .optional()
      .default(false),
  })
  .strict();

export const updateMessageSchema = z
  .object({
    isFavorite: z.boolean().optional(),
    isGoldBookSelected: z.boolean().optional(),
    coupleNotes: z.string().max(500).nullable().optional(),
    audioTrimStartSec: z.number().int().min(0).nullable().optional(),
    audioTrimEndSec: z.number().int().min(0).nullable().optional(),
    audioDurationSec: z.number().int().min(0).nullable().optional(),
  })
  .strict();

export class UpdateMessageDto extends createZodDto(updateMessageSchema) {}
export class ListMessagesQuery extends createZodDto(listMessagesQuerySchema) {}

export const retranscribeSchema = z
  .object({
    language: z.string().min(2).max(5).optional(),
  })
  .strict();
