import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import {
  activityOccurrences,
  activityTemplates,
  registrationActivities,
} from '../../database/schema/index.js';

export type ActivityListItem = {
  occurrenceId: string;
  templateId: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingPoint: string | null;
  capacity: number;
  seatsTaken: number;
  seatsLeft: number;
};

@Injectable()
export class ActivitiesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listOccurrences(date?: string): Promise<ActivityListItem[]> {
    const seatsTakenSubquery = this.db
      .select({
        occurrenceId: registrationActivities.occurrenceId,
        count: sql<number>`COUNT(*)::int`.as('seats_taken'),
      })
      .from(registrationActivities)
      .groupBy(registrationActivities.occurrenceId)
      .as('seats');

    const rows = await this.db
      .select({
        occurrenceId: activityOccurrences.id,
        templateId: activityTemplates.id,
        slug: activityTemplates.slug,
        name: activityTemplates.name,
        description: activityTemplates.description,
        category: activityTemplates.category,
        date: activityOccurrences.date,
        startTime: activityOccurrences.startTime,
        endTime: activityOccurrences.endTime,
        location: activityOccurrences.location,
        meetingPoint: activityOccurrences.meetingPoint,
        capacity: activityOccurrences.capacity,
        seatsTaken: sql<number>`COALESCE(${seatsTakenSubquery.count}, 0)::int`,
      })
      .from(activityOccurrences)
      .innerJoin(
        activityTemplates,
        eq(activityTemplates.id, activityOccurrences.templateId),
      )
      .leftJoin(
        seatsTakenSubquery,
        eq(seatsTakenSubquery.occurrenceId, activityOccurrences.id),
      )
      .where(date ? eq(activityOccurrences.date, date) : undefined)
      .orderBy(activityOccurrences.date, activityOccurrences.startTime);

    return rows.map((r) => ({
      ...r,
      seatsLeft: Math.max(0, r.capacity - r.seatsTaken),
    }));
  }

  async listFestivalDates(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ date: activityOccurrences.date })
      .from(activityOccurrences)
      .orderBy(activityOccurrences.date);
    return rows.map((r) => r.date);
  }
}
