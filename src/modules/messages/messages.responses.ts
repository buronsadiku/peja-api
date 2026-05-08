import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const messageSummarySchema = z.object({
  id: z.string().uuid(),
  guestNames: z.string(),
  hasAudio: z.boolean(),
  hasVideo: z.boolean(),
  hasPhoto: z.boolean(),
  mediaCount: z.number().int(),
  audioDurationSec: z.number().nullable(),
  transcriptSnippet: z.string().nullable(),
  writtenNote: z.string().nullable(),
  isFavorite: z.boolean(),
  isGoldBookSelected: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  photoThumbUrl: z.string().nullable(),
});

export class MessageSummaryDto extends createZodDto(messageSummarySchema) {}

const mediaItemSchema = z.object({
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

const messageDetailSchema = z.object({
  message: z.object({
    id: z.string().uuid(),
    guestNames: z.string(),
    audioUrl: z.string().nullable(),
    audioDurationSec: z.number().nullable(),
    audioMimeType: z.string().nullable(),
    media: z.array(mediaItemSchema),
    writtenNote: z.string().nullable(),
    transcript: z.string().nullable(),
    transcriptLanguage: z.string().nullable(),
    transcriptStatus: z.string(),
    isFavorite: z.boolean(),
    isGoldBookSelected: z.boolean(),
    coupleNotes: z.string().nullable(),
    audioTrimStartSec: z.number().nullable(),
    audioTrimEndSec: z.number().nullable(),
    submissionSource: z.string(),
    createdAt: z.string().datetime({ offset: true }),
  }),
});

export class MessageDetailDto extends createZodDto(messageDetailSchema) {}

const messageRowSchema = z.object({
  id: z.string().uuid(),
  guestNames: z.string(),
  isFavorite: z.boolean(),
  isGoldBookSelected: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
});

export class MessageRowDto extends createZodDto(messageRowSchema) {}

export class MessageWrapperDto {
  @ApiProperty({ type: MessageRowDto })
  message!: MessageRowDto;
}

const retranscribeResultSchema = z.object({
  jobId: z.string(),
});

export class RetranscribeResultDto extends createZodDto(
  retranscribeResultSchema,
) {}
