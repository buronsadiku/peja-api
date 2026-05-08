import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const submissionGuardFields = {
  _honeypot: z.string().optional(),
  _t: z.union([z.number(), z.string()]).optional(),
};

export const uploadUrlSchema = z
  .object({
    audioContentType: z.string().nullable().optional(),
    media: z
      .array(
        z.object({
          type: z.enum(['photo', 'video']),
          contentType: z.string().min(1),
        }),
      )
      .max(20)
      .optional(),
    source: z.enum(['kiosk', 'qr_scan', 'direct_link']).optional(),
    ...submissionGuardFields,
  })
  .strict();

export class UploadUrlDto extends createZodDto(uploadUrlSchema) {}

export const createMessageSchema = z
  .object({
    guestNames: z.string().min(1).max(200),
    audioKey: z.string().nullable().optional(),
    audioDurationSec: z.number().int().min(0).nullable().optional(),
    audioMimeType: z.string().nullable().optional(),
    mediaIds: z.array(z.string().uuid()).max(20).optional(),
    writtenNote: z.string().max(200).nullable().optional(),
    submissionSource: z.enum(['kiosk', 'qr_scan', 'direct_link']),
    submissionLanguage: z.string().nullable().optional(),
    clientCreatedAt: z.string().nullable().optional(),
    ...submissionGuardFields,
  })
  .strict()
  .refine(
    (d) =>
      d.audioKey ||
      (d.mediaIds && d.mediaIds.length > 0) ||
      (d.writtenNote && d.writtenNote.trim().length > 0),
    {
      message: 'At least one of audioKey, mediaIds, or writtenNote is required',
    },
  );

export class CreateMessageDto extends createZodDto(createMessageSchema) {}

export const invitationOpenSchema = z
  .object({
    channel: z.enum(['whatsapp', 'email', 'sms', 'link']).nullable().optional(),
    ...submissionGuardFields,
  })
  .strict();
