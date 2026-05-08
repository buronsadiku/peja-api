import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import Ajv, { type AnySchema, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { ProductsRepository } from './products.repository.js';

@Injectable()
export class CustomizationValidatorService {
  private readonly ajv: Ajv;
  private readonly cache = new Map<string, ValidateFunction>();

  constructor(private readonly productsRepo: ProductsRepository) {
    this.ajv = new Ajv({ allErrors: true, strict: false, useDefaults: false });
    addFormats(this.ajv);
  }

  async validate(
    productType: string,
    customization: Record<string, unknown>,
  ): Promise<void> {
    const schema = await this.productsRepo.findCustomizationSchema(productType);
    if (!schema) return;

    const cacheKey = `${productType}:${schema.version}`;
    let validator = this.cache.get(cacheKey);
    if (!validator) {
      validator = this.ajv.compile(schema.schemaJson as AnySchema);
      this.cache.set(cacheKey, validator);
    }

    if (!validator(customization)) {
      throw new UnprocessableEntityException({
        message: 'customization payload invalid',
        productType,
        errors: validator.errors,
      });
    }
  }
}
