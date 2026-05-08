import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const kioskSettingsSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  captureAudio: z.boolean(),
  capturePhoto: z.boolean(),
  captureVideo: z.boolean(),
  maxDurationSeconds: z.number().int(),
  returnAfterSeconds: z.number().int(),
  fullscreenLock: z.boolean(),
  guidedMode: z.boolean(),
  exitPin: z.string().nullable(),
  airplaneMode: z.boolean(),
  welcomeNote: z.string().nullable(),
  welcomeShowPhoto: z.boolean(),
  welcomeShowLanguagePicker: z.boolean(),
  welcomeChime: z.boolean(),
  offlineStore: z.boolean(),
  offlineStorageMb: z.number().int(),
  offlineNotify: z.boolean(),
  defaultLanguage: z.string(),
  supportedLanguages: z.array(z.string()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export class KioskSettingsDto extends createZodDto(kioskSettingsSchema) {}

export class KioskSettingsWrapperDto {
  @ApiProperty({ type: KioskSettingsDto })
  settings!: KioskSettingsDto;
}
