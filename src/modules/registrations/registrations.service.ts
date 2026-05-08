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
  registrationActivities,
  registrations,
} from '../../database/schema/index.js';
import { EmailService } from '../email/email.service.js';
import type { CreateRegistrationDto } from './registrations.dto.js';

type OccurrenceWithTemplate = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingPoint: string | null;
  capacity: number;
  templateName: string;
};

@Injectable()
export class RegistrationsService {
  private readonly logger = new Logger(RegistrationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly email: EmailService,
  ) {}

  async create(dto: CreateRegistrationDto) {
    await this.assertNotAlreadyRegistered(dto.email, dto.date);

    const occurrences = await this.fetchOccurrences(dto.occurrenceIds);
    this.assertAllOccurrencesOnDate(occurrences, dto.occurrenceIds, dto.date);
    this.assertNoOverlap(occurrences);

    return this.db.transaction(async (tx) => {
      await this.assertCapacity(tx, occurrences);

      const [created] = await tx
        .insert(registrations)
        .values({
          email: dto.email,
          fullName: dto.fullName,
          phone: dto.phone,
          date: dto.date,
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

      await this.email.sendRegistrationConfirmation({
        to: created.email,
        name: created.fullName,
        date: created.date,
        activities: occurrences.map((o) => ({
          name: o.templateName,
          startTime: o.startTime,
          endTime: o.endTime,
          location: o.location,
          meetingPoint: o.meetingPoint,
        })),
      });

      return {
        id: created.id,
        email: created.email,
        date: created.date,
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

  private async assertNotAlreadyRegistered(email: string, date: string) {
    const [existing] = await this.db
      .select({ id: registrations.id })
      .from(registrations)
      .where(and(eq(registrations.email, email), eq(registrations.date, date)))
      .limit(1);

    if (existing) {
      throw new ConflictException({
        code: 'already_registered',
        message: `email already registered for ${date}`,
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
        date: activityOccurrences.date,
        startTime: activityOccurrences.startTime,
        endTime: activityOccurrences.endTime,
        location: activityOccurrences.location,
        meetingPoint: activityOccurrences.meetingPoint,
        capacity: activityOccurrences.capacity,
        templateName: activityTemplates.name,
      })
      .from(activityOccurrences)
      .innerJoin(
        activityTemplates,
        eq(activityTemplates.id, activityOccurrences.templateId),
      )
      .where(inArray(activityOccurrences.id, ids));
    return rows;
  }

  private assertAllOccurrencesOnDate(
    occurrences: OccurrenceWithTemplate[],
    requestedIds: string[],
    date: string,
  ) {
    if (occurrences.length !== requestedIds.length) {
      throw new UnprocessableEntityException({
        code: 'unknown_occurrence',
        message: 'one or more activity ids do not exist',
      });
    }
    const wrongDay = occurrences.find((o) => o.date !== date);
    if (wrongDay) {
      throw new UnprocessableEntityException({
        code: 'wrong_date',
        message: `activity "${wrongDay.templateName}" is not on ${date}`,
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
