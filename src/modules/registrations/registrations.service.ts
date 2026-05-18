import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import {
  activityOccurrences,
  activityTemplates,
  festivalDays,
  registrationActivities,
  registrations,
} from '../../database/schema/index.js';
import { EmailService } from '../email/email.service.js';
import type { CreateRegistrationDto } from './registrations.dto.js';

type OccurrenceWithTemplate = {
  id: string;
  festivalDayId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingPoint: string | null;
  capacity: number;
  templateName: string;
  contactPhone1: string | null;
  contactPhone2: string | null;
};

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateRegistrationDto) {
    await this.assertNotAlreadyRegistered(dto.email, dto.festivalDayId);

    const occurrences = await this.fetchOccurrences(dto.occurrenceIds);
    this.assertAllOccurrencesOnDay(
      occurrences,
      dto.occurrenceIds,
      dto.festivalDayId,
    );
    this.assertNoOverlap(occurrences);

    return this.db.transaction(async (tx) => {
      await this.assertCapacity(tx, occurrences);

      const [created] = await tx
        .insert(registrations)
        .values({
          email: dto.email,
          fullName: dto.fullName,
          phone: dto.phone,
          festivalDayId: dto.festivalDayId,
          responsibilityAccepted: dto.responsibilityAccepted,
          notifyIfAbsent: dto.notifyIfAbsent,
        })
        .returning();

      await tx.insert(registrationActivities).values(
        dto.occurrenceIds.map((occurrenceId) => ({
          registrationId: created.id,
          occurrenceId,
        })),
      );

      const date = occurrences[0]?.date ?? '';

      await this.email.sendRegistrationConfirmation({
        to: created.email,
        name: created.fullName,
        date,
        activities: occurrences.map((o) => ({
          name: o.templateName,
          startTime: o.startTime,
          endTime: o.endTime,
          location: o.location,
          meetingPoint: o.meetingPoint,
          contactPhone1: o.contactPhone1,
          contactPhone2: o.contactPhone2,
        })),
      });

      return {
        id: created.id,
        email: created.email,
        date,
        festivalDayId: created.festivalDayId,
        activities: occurrences.map((o) => o.templateName),
      };
    });
  }

  async lookupByEmail(email: string) {
    const [row] = await this.db
      .select({
        fullName: registrations.fullName,
        phone: registrations.phone,
      })
      .from(registrations)
      .where(eq(registrations.email, email))
      .orderBy(desc(registrations.createdAt))
      .limit(1);

    return row ?? null;
  }

  private async assertNotAlreadyRegistered(
    email: string,
    festivalDayId: string,
  ) {
    const [existing] = await this.db
      .select({ id: registrations.id })
      .from(registrations)
      .where(
        and(
          eq(registrations.email, email),
          eq(registrations.festivalDayId, festivalDayId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException({
        code: 'already_registered',
        message: `email already registered for this festival day`,
      });
    }
  }

  private async fetchOccurrences(
    ids: string[],
  ): Promise<OccurrenceWithTemplate[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({
        id: activityOccurrences.id,
        festivalDayId: activityOccurrences.festivalDayId,
        date: festivalDays.date,
        startTime: activityOccurrences.startTime,
        endTime: activityOccurrences.endTime,
        location: activityOccurrences.location,
        meetingPoint: activityOccurrences.meetingPoint,
        capacity: activityOccurrences.capacity,
        templateName: activityTemplates.nameEn,
        contactPhone1: activityTemplates.contactPhone1,
        contactPhone2: activityTemplates.contactPhone2,
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
      .where(inArray(activityOccurrences.id, ids));
    return rows;
  }

  private assertAllOccurrencesOnDay(
    occurrences: OccurrenceWithTemplate[],
    requestedIds: string[],
    festivalDayId: string,
  ) {
    if (occurrences.length !== requestedIds.length) {
      throw new UnprocessableEntityException({
        code: 'unknown_occurrence',
        message: 'one or more activity ids do not exist',
      });
    }
    const wrongDay = occurrences.find(
      (o) => o.festivalDayId !== festivalDayId,
    );
    if (wrongDay) {
      throw new UnprocessableEntityException({
        code: 'wrong_day',
        message: `activity "${wrongDay.templateName}" is not on the selected day`,
      });
    }
  }

  private assertNoOverlap(occurrences: OccurrenceWithTemplate[]) {
    const sorted = [...occurrences].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (a.endTime > b.startTime) {
        throw new UnprocessableEntityException({
          code: 'time_conflict',
          message: `"${a.templateName}" (${a.startTime}–${a.endTime}) overlaps with "${b.templateName}" (${b.startTime}–${b.endTime})`,
          conflictA: a.id,
          conflictB: b.id,
        });
      }
    }
  }

  private async assertCapacity(
    tx: DrizzleDB,
    occurrences: OccurrenceWithTemplate[],
  ) {
    const ids = occurrences.map((o) => o.id);
    if (ids.length === 0) return;

    const counts = await tx
      .select({
        occurrenceId: registrationActivities.occurrenceId,
        taken: sql<number>`COUNT(*)::int`.as('taken'),
      })
      .from(registrationActivities)
      .where(inArray(registrationActivities.occurrenceId, ids))
      .groupBy(registrationActivities.occurrenceId);

    const takenById = new Map(counts.map((c) => [c.occurrenceId, c.taken]));

    for (const o of occurrences) {
      const taken = takenById.get(o.id) ?? 0;
      if (taken + 1 > o.capacity) {
        throw new ConflictException({
          code: 'activity_full',
          message: `"${o.templateName}" is full`,
          occurrenceId: o.id,
        });
      }
    }
  }
}
