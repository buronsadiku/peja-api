import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { festivalDays, musicians } from '../../database/schema/index.js';

type Locale = 'en' | 'sq';

const pickLocale = (raw: string | undefined): Locale =>
  raw === 'sq' ? 'sq' : 'en';

export type MusicianItem = {
  id: string;
  festivalDayId: string;
  festivalDayDate: string;
  festivalDayLabel: string | null;
  name: string;
  description: string | null;
  photoUrl: string;
  sortOrder: number;
};

@Injectable()
export class MusiciansService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list(
    festivalDayId?: string,
    localeInput?: string,
  ): Promise<MusicianItem[]> {
    const locale = pickLocale(localeInput);
    const nameExpr =
      locale === 'sq'
        ? sql<string>`COALESCE(${musicians.nameSq}, ${musicians.nameEn})`
        : sql<string>`${musicians.nameEn}`;
    const descExpr =
      locale === 'sq'
        ? sql<
            string | null
          >`COALESCE(${musicians.descriptionSq}, ${musicians.descriptionEn})`
        : sql<string | null>`${musicians.descriptionEn}`;

    const where = festivalDayId
      ? and(
          eq(musicians.isPublished, true),
          eq(musicians.festivalDayId, festivalDayId),
        )
      : eq(musicians.isPublished, true);

    return this.db
      .select({
        id: musicians.id,
        festivalDayId: musicians.festivalDayId,
        festivalDayDate: festivalDays.date,
        festivalDayLabel: festivalDays.label,
        name: nameExpr,
        description: descExpr,
        photoUrl: musicians.photoUrl,
        sortOrder: musicians.sortOrder,
      })
      .from(musicians)
      .innerJoin(festivalDays, eq(festivalDays.id, musicians.festivalDayId))
      .where(where)
      .orderBy(
        asc(festivalDays.sortOrder),
        asc(festivalDays.date),
        asc(musicians.sortOrder),
        asc(musicians.createdAt),
      );
  }
}
