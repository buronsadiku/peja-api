import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import {
  activityImages,
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
  coverImageUrl: string | null;
  festivalDayId: string;
  date: string;
  dayLabel: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingPoint: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
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

export type ActivityImageItem = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  isCover: boolean;
};

export type ActivityDetail = {
  templateId: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  coverImageUrl: string | null;
  images: ActivityImageItem[];
  occurrences: ActivityListItem[];
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

    const coverImageSubquery = this.db
      .select({
        templateId: activityImages.templateId,
        url: sql<string>`(ARRAY_AGG(${activityImages.url} ORDER BY ${activityImages.isCover} DESC, ${activityImages.sortOrder}))[1]`.as(
          'cover_url',
        ),
      })
      .from(activityImages)
      .groupBy(activityImages.templateId)
      .as('cover');

    const rows = await this.db
      .select({
        occurrenceId: activityOccurrences.id,
        templateId: activityTemplates.id,
        slug: activityTemplates.slug,
        name: activityTemplates.name,
        description: activityTemplates.description,
        category: activityTemplates.category,
        coverImageUrl: coverImageSubquery.url,
        festivalDayId: festivalDays.id,
        date: festivalDays.date,
        dayLabel: festivalDays.label,
        startTime: activityOccurrences.startTime,
        endTime: activityOccurrences.endTime,
        location: activityOccurrences.location,
        meetingPoint: activityOccurrences.meetingPoint,
        address: activityOccurrences.address,
        latitude: activityOccurrences.latitude,
        longitude: activityOccurrences.longitude,
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
      .leftJoin(
        coverImageSubquery,
        eq(coverImageSubquery.templateId, activityTemplates.id),
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

  async getBySlug(slug: string): Promise<ActivityDetail> {
    const [template] = await this.db
      .select()
      .from(activityTemplates)
      .where(eq(activityTemplates.slug, slug))
      .limit(1);

    if (!template) {
      throw new NotFoundException({
        code: 'activity_not_found',
        message: `activity "${slug}" does not exist`,
      });
    }

    const images = await this.db
      .select({
        id: activityImages.id,
        url: activityImages.url,
        alt: activityImages.alt,
        sortOrder: activityImages.sortOrder,
        isCover: activityImages.isCover,
      })
      .from(activityImages)
      .where(eq(activityImages.templateId, template.id))
      .orderBy(asc(activityImages.sortOrder));

    const cover =
      images.find((i) => i.isCover) ?? images[0] ?? null;

    const allOccurrences = await this.listOccurrences();
    const occurrences = allOccurrences.filter(
      (o) => o.templateId === template.id,
    );

    return {
      templateId: template.id,
      slug: template.slug,
      name: template.name,
      description: template.description,
      category: template.category,
      coverImageUrl: cover?.url ?? null,
      images,
      occurrences,
    };
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
