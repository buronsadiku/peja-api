import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const VISIBILITY_VALUES = ['private', 'unlisted', 'public'] as const;
export const SENDERS_VALUES = ['invited', 'anyone'] as const;

export const updateSettingsSchema = z
  .object({
    visibility: z.enum(VISIBILITY_VALUES).optional(),
    submissionsSenders: z.enum(SENDERS_VALUES).optional(),
    submissionsSigninRequired: z.boolean().optional(),
    reviewBeforePublish: z.boolean().optional(),
    reviewFlagEnabled: z.boolean().optional(),
    autoPublish: z.boolean().optional(),
    showMessageCount: z.boolean().optional(),
    showOtherMessages: z.boolean().optional(),
    showContributorNames: z.boolean().optional(),
    aiTranscribe: z.boolean().optional(),
    aiShowTranscriptToGuest: z.boolean().optional(),
    aiSuggestions: z.boolean().optional(),
  })
  .strict();

export class UpdateSettingsDto extends createZodDto(updateSettingsSchema) {}
