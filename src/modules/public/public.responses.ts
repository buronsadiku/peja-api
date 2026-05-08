import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const publicKioskSettingsSchema = z.object({
  captureAudio: z.boolean(),
  capturePhoto: z.boolean(),
  captureVideo: z.boolean(),
  maxDurationSeconds: z.number().int(),
  returnAfterSeconds: z.number().int(),
  welcomeShowPhoto: z.boolean(),
  welcomeShowLanguagePicker: z.boolean(),
  welcomeChime: z.boolean(),
  fullscreenLock: z.boolean(),
  guidedMode: z.boolean(),
  exitPin: z.string().nullable(),
});

const publicEventSchema = z.object({
  partnerAName: z.string(),
  partnerBName: z.string(),
  weddingDate: z.string().nullable(),
  welcomeMessage: z.string().nullable(),
  themeColor: z.string(),
  couplePhotoUrl: z.string().nullable(),
  defaultLanguage: z.string(),
  supportedLanguages: z.array(z.string()),
  submissionOpen: z.boolean(),
  limitReached: z.boolean(),
  kiosk: publicKioskSettingsSchema,
});

export class PublicEventDto extends createZodDto(publicEventSchema) {}

const audioTargetSchema = z.object({
  kind: z.literal('audio'),
  key: z.string(),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  maxSizeBytes: z.number(),
  expiresAt: z.string().datetime({ offset: true }),
});

const mediaTargetSchema = z.object({
  mediaId: z.string().uuid(),
  type: z.enum(['photo', 'video']),
  key: z.string(),
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  maxSizeBytes: z.number(),
  expiresAt: z.string().datetime({ offset: true }),
});

const uploadUrlsResultSchema = z.object({
  audioTargets: z.array(audioTargetSchema),
  mediaTargets: z.array(mediaTargetSchema),
});

export class UploadUrlsResultDto extends createZodDto(uploadUrlsResultSchema) {}

const createMessageResultSchema = z.object({
  message: z.object({
    id: z.string().uuid(),
    status: z.string(),
  }),
});

export class CreateMessageResultDto extends createZodDto(
  createMessageResultSchema,
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

const publicGallerySchema = z.object({
  data: z.array(galleryItemSchema),
  nextCursor: z.string().nullable(),
});

export class PublicGalleryDto extends createZodDto(publicGallerySchema) {}
