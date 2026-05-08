import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const mediaUploadTargetSchema = z.object({
  mediaId: z.string().uuid(),
  type: z.enum(['photo', 'video']),
  key: z.string(),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  maxSizeBytes: z.number(),
  expiresAt: z.string().datetime({ offset: true }),
});

const mediaUploadUrlsResultSchema = z.object({
  uploadTargets: z.array(mediaUploadTargetSchema),
});

export class MediaUploadUrlsResultDto extends createZodDto(
  mediaUploadUrlsResultSchema,
) {}

const galleryItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['photo', 'video']),
  uploaderType: z.enum(['guest', 'owner']),
  messageId: z.string().uuid().nullable(),
  url: z.string().nullable(),
  thumbUrl: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  durationSec: z.number().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

const galleryFeedSchema = z.object({
  data: z.array(galleryItemSchema),
  nextCursor: z.string().nullable(),
});

export class GalleryFeedDto extends createZodDto(galleryFeedSchema) {}
