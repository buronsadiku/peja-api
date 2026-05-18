import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { galleryImages } from '../../database/schema/index.js';

export type GallerySection = 'live' | 'workshops' | 'adventures' | 'food';

export type ListOptions = {
  section?: GallerySection;
  page?: number;
  limit?: number;
  showOnLanding?: boolean;
};

@Injectable()
export class GalleryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list({
    section,
    page = 1,
    limit = 20,
    showOnLanding,
  }: ListOptions = {}) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const filters: SQL[] = [];
    if (section) filters.push(eq(galleryImages.section, section));
    if (typeof showOnLanding === 'boolean')
      filters.push(eq(galleryImages.showOnLanding, showOnLanding));
    const where = filters.length ? and(...filters) : undefined;

    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(galleryImages)
      .where(where);

    const data = await this.db
      .select()
      .from(galleryImages)
      .where(where)
      .orderBy(
        asc(galleryImages.section),
        asc(galleryImages.sortOrder),
        asc(galleryImages.id),
      )
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
