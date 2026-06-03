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
import {
  EmailService,
  type RegistrationEmailDay,
} from '../email/email.service.js';
import type {
  CreateRegistrationBatchDto,
  CreateRegistrationDto,
} from './registrations.dto.js';

type OccurrenceWithTemplate = {
  id: string;
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
  templateName: string;
  contactPhone1: string | null;
  contactPhone2: string | null;
};

type DaySuccess = {
  registrationId: string;
  festivalDayId: string;
  date: string;
  dayLabel: string | null;
  activities: OccurrenceWithTemplate[];
};

type DaySkipped = {
  festivalDayId: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
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

    const result = await this.db.transaction(async (tx) => {
      await this.assertCapacity(tx, occurrences);
      return this.insertRegistration(tx, dto, occurrences);
    });

    const date = occurrences[0]?.date ?? '';
    const dayLabel = occurrences[0]?.dayLabel ?? null;

    await this.email.sendRegistrationConfirmation({
      to: result.email,
      name: result.fullName,
      days: [this.buildEmailDay(date, dayLabel, occurrences)],
    });

    return {
      id: result.id,
      email: result.email,
      date,
      festivalDayId: result.festivalDayId,
      activities: occurrences.map((o) => o.templateName),
    };
  }

  async createBatch(dto: CreateRegistrationBatchDto) {
    const seenDayIds = new Set<string>();
    for (const day of dto.days) {
      if (seenDayIds.has(day.festivalDayId)) {
        throw new UnprocessableEntityException({
          code: 'duplicate_day',
          message: 'each festival day can only appear once',
        });
      }
      seenDayIds.add(day.festivalDayId);
    }

    const created: DaySuccess[] = [];
    const skipped: DaySkipped[] = [];

    for (const day of dto.days) {
      try {
        const outcome = await this.processSingleDay({
          email: dto.email,
          fullName: dto.fullName,
          phone: dto.phone,
          festivalDayId: day.festivalDayId,
          occurrenceIds: day.occurrenceIds,
          responsibilityAccepted: dto.responsibilityAccepted,
          notifyIfAbsent: dto.notifyIfAbsent,
        });
        created.push(outcome);
      } catch (err) {
        const info = this.extractError(err);
        skipped.push({
          festivalDayId: day.festivalDayId,
          code: info.code,
          message: info.message,
          details: info.details,
        });
      }
    }

    if (created.length > 0) {
      const emailDays: RegistrationEmailDay[] = created
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((c) => this.buildEmailDay(c.date, c.dayLabel, c.activities));
      await this.email.sendRegistrationConfirmation({
        to: dto.email,
        name: dto.fullName,
        days: emailDays,
      });
    }

    return {
      created: created.map((c) => ({
        registrationId: c.registrationId,
        festivalDayId: c.festivalDayId,
        date: c.date,
        activities: c.activities.map((a) => a.templateName),
      })),
      skipped,
    };
  }

  async reminderRecipientsCount(): Promise<{
    recipients: number;
    totalRegistrations: number;
  }> {
    const groups = await this.loadRegistrationsGroupedByEmail();
    const totalRegistrations = groups.reduce(
      (n, g) => n + g.days.reduce((m, d) => m + d.activities.length, 0),
      0,
    );
    return { recipients: groups.length, totalRegistrations };
  }

  async sendReminders(): Promise<{
    recipients: number;
    sent: number;
    failed: number;
  }> {
    const groups = await this.loadRegistrationsGroupedByEmail();
    let sent = 0;
    let failed = 0;
    for (const g of groups) {
      const { ok } = await this.email.sendRegistrationReminder({
        to: g.email,
        name: g.fullName,
        days: g.days,
      });
      if (ok) sent += 1;
      else failed += 1;
    }
    return { recipients: groups.length, sent, failed };
  }

  private async loadRegistrationsGroupedByEmail(): Promise<
    Array<{
      email: string;
      fullName: string;
      days: RegistrationEmailDay[];
    }>
  > {
    const rows = await this.db
      .select({
        email: registrations.email,
        fullName: registrations.fullName,
        createdAt: registrations.createdAt,
        date: festivalDays.date,
        dayLabel: festivalDays.label,
        festivalDayId: festivalDays.id,
        festivalDayOrder: festivalDays.sortOrder,
        occurrenceId: activityOccurrences.id,
        startTime: activityOccurrences.startTime,
        endTime: activityOccurrences.endTime,
        location: activityOccurrences.location,
        meetingPoint: activityOccurrences.meetingPoint,
        address: activityOccurrences.address,
        latitude: activityOccurrences.latitude,
        longitude: activityOccurrences.longitude,
        templateName: activityTemplates.nameEn,
        contactPhone1: activityTemplates.contactPhone1,
        contactPhone2: activityTemplates.contactPhone2,
      })
      .from(registrations)
      .innerJoin(
        registrationActivities,
        eq(registrationActivities.registrationId, registrations.id),
      )
      .innerJoin(
        activityOccurrences,
        eq(activityOccurrences.id, registrationActivities.occurrenceId),
      )
      .innerJoin(
        activityTemplates,
        eq(activityTemplates.id, activityOccurrences.templateId),
      )
      .innerJoin(
        festivalDays,
        eq(festivalDays.id, activityOccurrences.festivalDayId),
      );

    type Group = {
      email: string;
      fullName: string;
      latestCreatedAt: Date;
      byDay: Map<
        string,
        {
          date: string;
          dayLabel: string | null;
          dayOrder: number | null;
          startTimes: Map<string, RegistrationEmailDay['activities'][number]>;
        }
      >;
    };

    const byEmail = new Map<string, Group>();

    for (const r of rows) {
      const emailKey = r.email.toLowerCase();
      let g = byEmail.get(emailKey);
      if (!g) {
        g = {
          email: r.email,
          fullName: r.fullName,
          latestCreatedAt: r.createdAt as Date,
          byDay: new Map(),
        };
        byEmail.set(emailKey, g);
      } else if (
        (r.createdAt as Date).getTime() > g.latestCreatedAt.getTime()
      ) {
        g.fullName = r.fullName;
        g.latestCreatedAt = r.createdAt as Date;
      }

      let day = g.byDay.get(r.festivalDayId);
      if (!day) {
        day = {
          date: r.date,
          dayLabel: r.dayLabel,
          dayOrder: r.festivalDayOrder ?? null,
          startTimes: new Map(),
        };
        g.byDay.set(r.festivalDayId, day);
      }
      if (!day.startTimes.has(r.occurrenceId)) {
        day.startTimes.set(r.occurrenceId, {
          name: r.templateName,
          startTime: r.startTime,
          endTime: r.endTime,
          location: r.location,
          meetingPoint: r.meetingPoint,
          address: r.address,
          latitude: r.latitude,
          longitude: r.longitude,
          contactPhone1: r.contactPhone1,
          contactPhone2: r.contactPhone2,
        });
      }
    }

    return Array.from(byEmail.values())
      .map((g) => ({
        email: g.email,
        fullName: g.fullName,
        days: Array.from(g.byDay.values())
          .sort((a, b) => {
            const oa = a.dayOrder ?? Number.MAX_SAFE_INTEGER;
            const ob = b.dayOrder ?? Number.MAX_SAFE_INTEGER;
            if (oa !== ob) return oa - ob;
            return a.date.localeCompare(b.date);
          })
          .map((d) => ({
            date: d.date,
            dayLabel: d.dayLabel,
            activities: Array.from(d.startTimes.values()).sort((a, b) =>
              a.startTime.localeCompare(b.startTime),
            ),
          })),
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
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

    if (!row) return null;

    const registeredDays = await this.db
      .select({ festivalDayId: registrations.festivalDayId })
      .from(registrations)
      .where(eq(registrations.email, email));

    return {
      ...row,
      registeredDayIds: registeredDays.map((r) => r.festivalDayId),
    };
  }

  private async processSingleDay(
    dto: CreateRegistrationDto,
  ): Promise<DaySuccess> {
    await this.assertNotAlreadyRegistered(dto.email, dto.festivalDayId);

    const occurrences = await this.fetchOccurrences(dto.occurrenceIds);
    this.assertAllOccurrencesOnDay(
      occurrences,
      dto.occurrenceIds,
      dto.festivalDayId,
    );
    this.assertNoOverlap(occurrences);

    const result = await this.db.transaction(async (tx) => {
      await this.assertCapacity(tx, occurrences);
      return this.insertRegistration(tx, dto, occurrences);
    });

    return {
      registrationId: result.id,
      festivalDayId: result.festivalDayId,
      date: occurrences[0]?.date ?? '',
      dayLabel: occurrences[0]?.dayLabel ?? null,
      activities: occurrences,
    };
  }

  private async insertRegistration(
    tx: DrizzleDB,
    dto: CreateRegistrationDto,
    occurrences: OccurrenceWithTemplate[],
  ) {
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
      occurrences.map((o) => ({
        registrationId: created.id,
        occurrenceId: o.id,
      })),
    );

    return created;
  }

  private buildEmailDay(
    date: string,
    dayLabel: string | null,
    occurrences: OccurrenceWithTemplate[],
  ): RegistrationEmailDay {
    return {
      date,
      dayLabel,
      activities: occurrences.map((o) => ({
        name: o.templateName,
        startTime: o.startTime,
        endTime: o.endTime,
        location: o.location,
        meetingPoint: o.meetingPoint,
        address: o.address,
        latitude: o.latitude,
        longitude: o.longitude,
        contactPhone1: o.contactPhone1,
        contactPhone2: o.contactPhone2,
      })),
    };
  }

  private extractError(err: unknown): {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } {
    if (
      err instanceof ConflictException ||
      err instanceof UnprocessableEntityException
    ) {
      const response = err.getResponse();
      if (response && typeof response === 'object') {
        const r = response as Record<string, unknown>;
        return {
          code: (r.code as string) ?? 'unknown_error',
          message: (r.message as string) ?? err.message,
          details: r,
        };
      }
      return { code: 'unknown_error', message: err.message };
    }
    this.logger.error({ err }, 'unexpected error in processSingleDay');
    return {
      code: 'unexpected_error',
      message: err instanceof Error ? err.message : 'unexpected error',
    };
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
        dayLabel: festivalDays.label,
        startTime: activityOccurrences.startTime,
        endTime: activityOccurrences.endTime,
        location: activityOccurrences.location,
        meetingPoint: activityOccurrences.meetingPoint,
        address: activityOccurrences.address,
        latitude: activityOccurrences.latitude,
        longitude: activityOccurrences.longitude,
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
