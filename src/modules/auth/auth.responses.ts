import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  preferredLanguage: z.string(),
  role: z.string(),
  emailPreferences: z
    .object({
      marketing: z.boolean(),
      digest: z.boolean(),
      alerts: z.boolean(),
    })
    .nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export class UserDto extends createZodDto(userSchema) {}

const messageResultSchema = z.object({
  message: z.string(),
});

export class MessageResultDto extends createZodDto(messageResultSchema) {}

export class UserWrapperDto {
  @ApiProperty({ type: UserDto })
  user!: UserDto;
}
