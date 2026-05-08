import { Inject, Injectable } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import {
  activityOccurrences,
  activityTemplates,
  festivalDays,
  registrationActivities,
} from '../../database/schema/index.js';

export type ActivityListItem = {
  occurrenceId: string;
  templateId: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  festivalDayId: string;
  date: string;
  dayLabel: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingPoint: string | null;
  capacity: number;
  seatsTaken: number;
  seatsLeft: number;
};

export type FestivalDayItem = {
  id: string;
  date: string;
  label: string | null;
  sortOrder: number;
};

@Injectable()
export class ActivitiesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async listOccurrences(festivalDayId?: string): Promise<ActivityListItem[]> {
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
        festivalDayId: festivalDays.id,
        date: festivalDays.date,
        dayLabel: festivalDays.label,
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
      .innerJoin(
        festivalDays,
        eq(festivalDays.id, activityOccurrences.festivalDayId),
      )
      .leftJoin(
        seatsTakenSubquery,
        eq(seatsTakenSubquery.occurrenceId, activityOccurrences.id),
      )
      .where(
        festivalDayId
          ? eq(activityOccurrences.festivalDayId, festivalDayId)
          : undefined,
      )
      .orderBy(festivalDays.sortOrder, activityOccurrences.startTime);

    return rows.map((r) => ({
      ...r,
      seatsLeft: Math.max(0, r.capacity - r.seatsTaken),
    }));
  }

  async listFestivalDays(): Promise<FestivalDayItem[]> {
    return this.db
      .select({
        id: festivalDays.id,
        date: festivalDays.date,
        label: festivalDays.label,
        sortOrder: festivalDays.sortOrder,
      })
      .from(festivalDays)
      .orderBy(asc(festivalDays.sortOrder), asc(festivalDays.date));
  }
}
