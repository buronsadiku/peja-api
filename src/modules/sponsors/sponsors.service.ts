import { Inject, Injectable } from '@nestjs/common';
import { asc, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { sponsors } from '../../database/schema/index.js';

@Injectable()
export class SponsorsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async list() {
    return this.db
      .select()
      .from(sponsors)
      .orderBy(
        sql`CASE ${sponsors.tier} WHEN 'gold' THEN 1 WHEN 'silver' THEN 2 WHEN 'bronze' THEN 3 ELSE 4 END`,
        asc(sponsors.sortOrder),
      );
  }
}
