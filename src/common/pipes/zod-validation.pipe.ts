import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/errors.js';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private schema: ZodSchema;
  constructor(schema: ZodSchema) {
    this.schema = schema;
  }

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.') || '_root';
        fields[path] = issue.message;
      }
      throw new ValidationError(fields);
    }
    return result.data;
  }
}
