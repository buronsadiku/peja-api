import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const jobSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  progress: z.number().nullable(),
  result: z.unknown().nullable(),
  error: z.string().nullable(),
});

export class JobDto extends createZodDto(jobSchema) {}

export class JobWrapperDto {
  @ApiProperty({ type: JobDto })
  job!: JobDto;
}
