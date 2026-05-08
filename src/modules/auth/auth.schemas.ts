import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SUPPORTED_LANGUAGES } from '../../common/constants.js';

export const updateProfileSchema = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().url().optional(),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
    emailPreferences: z
      .object({
        marketing: z.boolean(),
        digest: z.boolean(),
        alerts: z.boolean(),
      })
      .optional(),
  })
  .strict();

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
