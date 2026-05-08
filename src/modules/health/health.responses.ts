import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const healthSchema = z.object({
  status: z.enum(['ok']),
});

export class HealthDto extends createZodDto(healthSchema) {}

const healthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});

const readySchema = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: z.record(z.string(), healthCheckSchema),
});

export class ReadyDto extends createZodDto(readySchema) {}
