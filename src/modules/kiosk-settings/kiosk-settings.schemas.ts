import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SUPPORTED_LANGUAGES } from '../../common/constants.js';

export const MAX_DURATION_OPTIONS = [15, 30, 60, 90, 120, 180] as const;
export const RETURN_AFTER_OPTIONS = [10, 20, 30, 60, 120] as const;
export const OFFLINE_STORAGE_MIN = 100;
export const OFFLINE_STORAGE_MAX = 5000;
export const WELCOME_NOTE_MAX = 180;

export const updateKioskSettingsSchema = z
  .object({
    captureAudio: z.boolean().optional(),
    capturePhoto: z.boolean().optional(),
    captureVideo: z.boolean().optional(),

    maxDurationSeconds: z
      .number()
      .int()
      .refine((v) => MAX_DURATION_OPTIONS.includes(v as never))
      .optional(),
    returnAfterSeconds: z
      .number()
      .int()
      .refine((v) => RETURN_AFTER_OPTIONS.includes(v as never))
      .optional(),

    fullscreenLock: z.boolean().optional(),
    guidedMode: z.boolean().optional(),
    exitPin: z
      .string()
      .length(4)
      .regex(/^\d{4}$/)
      .nullable()
      .optional(),
    airplaneMode: z.boolean().optional(),

    welcomeNote: z.string().max(WELCOME_NOTE_MAX).nullable().optional(),
    welcomeShowPhoto: z.boolean().optional(),
    welcomeShowLanguagePicker: z.boolean().optional(),
    welcomeChime: z.boolean().optional(),

    offlineStore: z.boolean().optional(),
    offlineStorageMb: z
      .number()
      .int()
      .min(OFFLINE_STORAGE_MIN)
      .max(OFFLINE_STORAGE_MAX)
      .optional(),
    offlineNotify: z.boolean().optional(),

    defaultLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
    supportedLanguages: z
      .array(z.enum(SUPPORTED_LANGUAGES))
      .min(1)
      .max(20)
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      !data.supportedLanguages ||
      !data.defaultLanguage ||
      data.supportedLanguages.includes(data.defaultLanguage),
    { message: 'defaultLanguage must be in supportedLanguages' },
  );

export class UpdateKioskSettingsDto extends createZodDto(
  updateKioskSettingsSchema,
) {}
