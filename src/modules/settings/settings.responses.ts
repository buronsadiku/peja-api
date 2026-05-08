import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';
import { SENDERS_VALUES, VISIBILITY_VALUES } from './settings.schemas.js';

const eventSettingsSchema = z.object({
  eventId: z.string().uuid(),
  visibility: z.enum(VISIBILITY_VALUES),
  submissionsSenders: z.enum(SENDERS_VALUES),
  submissionsSigninRequired: z.boolean(),
  reviewBeforePublish: z.boolean(),
  reviewFlagEnabled: z.boolean(),
  autoPublish: z.boolean(),
  showMessageCount: z.boolean(),
  showOtherMessages: z.boolean(),
  showContributorNames: z.boolean(),
  aiTranscribe: z.boolean(),
  aiShowTranscriptToGuest: z.boolean(),
  aiSuggestions: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export class SettingsDto extends createZodDto(eventSettingsSchema) {}

export class SettingsWrapperDto {
  @ApiProperty({ type: SettingsDto })
  settings!: SettingsDto;
}
