import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import {
  productCustomizationSchemas,
  productVariants,
  products,
} from '../../database/schema/index.js';

export type ProductRow = typeof products.$inferSelect;
export type ProductVariantRow = typeof productVariants.$inferSelect;
export type ProductCustomizationSchemaRow =
  typeof productCustomizationSchemas.$inferSelect;

export interface ProductWithRelations {
  product: ProductRow;
  variants: ProductVariantRow[];
  customizationSchema: ProductCustomizationSchemaRow | undefined;
}

@Injectable()
export class ProductsRepository {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  async listActive(category?: string): Promise<ProductRow[]> {
    const conditions = [
      eq(products.isActive, true),
      isNull(products.deletedAt),
    ];
    if (category) conditions.push(eq(products.category, category));
    return this.db
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.sortOrder));
  }

  async findBySlug(slug: string): Promise<ProductRow | undefined> {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.slug, slug), isNull(products.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findBySku(sku: string): Promise<ProductRow | undefined> {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.sku, sku), isNull(products.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findById(id: string): Promise<ProductRow | undefined> {
    const rows = await this.db
      .select()
      .from(products)
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .limit(1);
    return rows[0];
  }

  async findVariantById(id: string): Promise<ProductVariantRow | undefined> {
    const rows = await this.db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, id))
      .limit(1);
    return rows[0];
  }

  async listVariants(productId: string): Promise<ProductVariantRow[]> {
    return this.db
      .select()
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          eq(productVariants.isActive, true),
        ),
      )
      .orderBy(asc(productVariants.sortOrder));
  }

  async findCustomizationSchema(
    productType: string,
  ): Promise<ProductCustomizationSchemaRow | undefined> {
    const rows = await this.db
      .select()
      .from(productCustomizationSchemas)
      .where(eq(productCustomizationSchemas.productType, productType))
      .limit(1);
    return rows[0];
  }

  async findBySlugWithRelations(
    slug: string,
  ): Promise<ProductWithRelations | undefined> {
    const product = await this.findBySlug(slug);
    if (!product) return undefined;
    const [variants, customizationSchema] = await Promise.all([
      this.listVariants(product.id),
      this.findCustomizationSchema(product.productType),
    ]);
    return { product, variants, customizationSchema };
  }
}
