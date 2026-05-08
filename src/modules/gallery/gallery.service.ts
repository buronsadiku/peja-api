import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { galleryImages } from '../../database/schema/index.js';

export type GallerySection = 'live' | 'workshops' | 'adventures' | 'food';

@Injectable()
export class GalleryService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(section?: GallerySection) {
    return this.db
      .select()
      .from(galleryImages)
      .where(section ? eq(galleryImages.section, section) : undefined)
      .orderBy(asc(galleryImages.section), asc(galleryImages.sortOrder));
  }
}
