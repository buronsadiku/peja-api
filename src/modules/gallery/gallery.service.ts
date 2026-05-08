import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { galleryImages } from '../../database/schema/index.js';

export type GallerySection = 'live' | 'workshops' | 'adventures' | 'food';

export type ListOptions = {
  section?: GallerySection;
  page?: number;
  limit?: number;
};

@Injectable()
export class GalleryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list({ section, page = 1, limit = 20 }: ListOptions = {}) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;
    const where = section ? eq(galleryImages.section, section) : undefined;

    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(galleryImages)
      .where(where);

    const data = await this.db
      .select()
      .from(galleryImages)
      .where(where)
      .orderBy(asc(galleryImages.section), asc(galleryImages.sortOrder))
      .limit(safeLimit)
      .offset(offset);

    return {
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / safeLimit)),
      },
    };
  }
}
