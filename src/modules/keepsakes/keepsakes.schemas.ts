import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const goldBookPreviewSchema = z
  .object({
    messageIds: z.array(z.string().uuid()),
    layout: z.enum(['classic', 'modern', 'minimal']).default('classic'),
    coverTitle: z.string().max(100),
    coverSubtitle: z.string().max(100).optional(),
  })
  .strict();

export class GoldBookPreviewDto extends createZodDto(goldBookPreviewSchema) {}

export const videoMontagePreviewSchema = z
  .object({
    messageIds: z.array(z.string().uuid()),
    style: z.enum(['cinematic', 'party', 'emotional']).default('cinematic'),
    musicTrackId: z.string().optional(),
  })
  .strict();

export class VideoMontagePreviewDto extends createZodDto(
  videoMontagePreviewSchema,
) {}
