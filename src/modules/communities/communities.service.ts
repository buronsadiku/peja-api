import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { communities } from '../../database/schema/index.js';

type Locale = 'en' | 'sq';

const pickLocale = (raw: string | undefined): Locale =>
  raw === 'sq' ? 'sq' : 'en';

export type CommunityItem = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  sortOrder: number;
};

@Injectable()
export class CommunitiesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  private descExpr(locale: Locale) {
    return locale === 'sq'
      ? sql<string>`COALESCE(${communities.descriptionSq}, ${communities.descriptionEn})`
      : sql<string>`${communities.descriptionEn}`;
  }

  async list(localeInput?: string): Promise<CommunityItem[]> {
    const locale = pickLocale(localeInput);

    return this.db
      .select({
        id: communities.id,
        name: communities.name,
        slug: communities.slug,
        logoUrl: communities.logoUrl,
        description: this.descExpr(locale),
        sortOrder: communities.sortOrder,
      })
      .from(communities)
      .orderBy(asc(communities.sortOrder), asc(communities.name));
  }

  async getBySlug(slug: string, localeInput?: string): Promise<CommunityItem> {
    const locale = pickLocale(localeInput);
    const [row] = await this.db
      .select({
        id: communities.id,
        name: communities.name,
        slug: communities.slug,
        logoUrl: communities.logoUrl,
        description: this.descExpr(locale),
        sortOrder: communities.sortOrder,
      })
      .from(communities)
      .where(eq(communities.slug, slug))
      .limit(1);

    if (!row) {
      throw new NotFoundException({
        code: 'community_not_found',
        message: `community "${slug}" does not exist`,
      });
    }
    return row;
  }
}
