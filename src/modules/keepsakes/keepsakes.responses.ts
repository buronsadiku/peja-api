import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const catalogItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  description: z.string(),
  priceCents: z.number(),
  currency: z.string(),
});

const catalogResultSchema = z.object({
  products: z.array(catalogItemSchema),
});

export class CatalogResultDto extends createZodDto(catalogResultSchema) {}

const previewResultSchema = z.object({
  jobId: z.string(),
});

export class PreviewResultDto extends createZodDto(previewResultSchema) {}

const productVariantDtoSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  priceCents: z.number().nullable(),
  currency: z.string(),
  attributes: z.record(z.string(), z.unknown()),
  isActive: z.boolean(),
  sortOrder: z.number(),
});

const productCustomizationSchemaDtoSchema = z
  .object({
    productType: z.string(),
    schemaJson: z.record(z.string(), z.unknown()),
    version: z.number(),
  })
  .nullable();

const productDtoSchema = z.object({
  id: z.string(),
  sku: z.string(),
  slug: z.string(),
  productType: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  basePriceCents: z.number(),
  currency: z.string(),
  category: z.string(),
  heroImageUrl: z.string().nullable(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number(),
  leadTimeMinDays: z.number().nullable(),
  leadTimeMaxDays: z.number().nullable(),
});

const productDetailResultSchema = z.object({
  product: productDtoSchema,
  variants: z.array(productVariantDtoSchema),
  customizationSchema: productCustomizationSchemaDtoSchema,
});

export class ProductDetailResultDto extends createZodDto(
  productDetailResultSchema,
) {}
