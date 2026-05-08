import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, or, sql, gt } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { newsPosts } from '../../database/schema/index.js';

@Injectable()
export class NewsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;
    const now = new Date();

    const where = and(
      sql`${newsPosts.publishedAt} <= NOW()`,
      or(isNull(newsPosts.expiresAt), gt(newsPosts.expiresAt, now)),
    );

    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(newsPosts)
      .where(where);

    const data = await this.db
      .select()
      .from(newsPosts)
      .where(where)
      .orderBy(desc(newsPosts.pinned), desc(newsPosts.publishedAt))
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

  async getBySlug(slug: string) {
    const [row] = await this.db
      .select()
      .from(newsPosts)
      .where(eq(newsPosts.slug, slug))
      .limit(1);

    if (!row) {
      throw new NotFoundException({
        code: 'news_not_found',
        message: 'post not found',
      });
    }
    return row;
  }
}
