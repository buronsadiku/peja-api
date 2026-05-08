import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq, and, isNull, isNotNull, gte, lt } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { events, messages, emailLog } from '../../database/schema/index.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { jobOptions } from '../queue/queue.utils.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger('SchedulerService');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CLEANUP) private readonly cleanupQueue: Queue,
  ) {}

  @Cron('0 9 * * *', { name: 'daily-scheduler', timeZone: 'UTC' })
  async runDaily() {
    this.logger.log('Daily scheduler started');

    await Promise.allSettled([
      this.processDailyDigests(),
      this.processWeddingWeekReminders(),
      this.processWeddingDayReminders(),
      this.processStorageExpiryWarnings(),
      this.processPostWeddingSummaries(),
      this.processCleanupJobs(),
    ]);

    this.logger.log('Daily scheduler completed');
  }

  private async processDailyDigests() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventsWithMessages = await this.db
      .select({
        eventId: events.id,
      })
      .from(events)
      .innerJoin(messages, eq(messages.eventId, events.id))
      .where(
        and(
          eq(events.status, 'active'),
          isNull(events.deletedAt),
          isNull(messages.deletedAt),
          gte(messages.createdAt, yesterday),
          lt(messages.createdAt, today),
        ),
      )
      .groupBy(events.id);

    let enqueued = 0;
    for (const row of eventsWithMessages) {
      if (await this.alreadySent(row.eventId, 'daily_digest', today)) continue;

      await this.emailQueue.add(
        JOB_NAMES.SEND_DAILY_DIGEST,
        { eventId: row.eventId, date: yesterday.toISOString() },
        jobOptions(),
      );
      enqueued++;
    }

    this.logger.log({ enqueued }, 'Daily digests enqueued');
  }

  private async processWeddingWeekReminders() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const dateStr = sevenDaysFromNow.toISOString().split('T')[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = await this.db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.weddingDate, dateStr),
          eq(events.status, 'active'),
          isNull(events.deletedAt),
        ),
      );

    let enqueued = 0;
    for (const event of upcomingEvents) {
      if (await this.alreadySent(event.id, 'wedding_week_reminder', today))
        continue;

      await this.emailQueue.add(
        JOB_NAMES.SEND_WEDDING_DAY_CHECKLIST,
        { eventId: event.id },
        jobOptions(),
      );
      enqueued++;
    }

    this.logger.log({ enqueued }, 'Wedding week reminders enqueued');
  }

  private async processWeddingDayReminders() {
    const todayStr = new Date().toISOString().split('T')[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weddingDayEvents = await this.db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.weddingDate, todayStr),
          eq(events.status, 'active'),
          isNull(events.deletedAt),
        ),
      );

    let enqueued = 0;
    for (const event of weddingDayEvents) {
      if (await this.alreadySent(event.id, 'wedding_day_checklist', today))
        continue;

      await this.emailQueue.add(
        JOB_NAMES.SEND_WEDDING_DAY_CHECKLIST,
        { eventId: event.id },
        jobOptions(),
      );
      enqueued++;
    }

    this.logger.log({ enqueued }, 'Wedding day reminders enqueued');
  }

  private async processStorageExpiryWarnings() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const startOfDay = new Date(sevenDaysFromNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sevenDaysFromNow);
    endOfDay.setHours(23, 59, 59, 999);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiringEvents = await this.db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          isNotNull(events.storageExpiresAt),
          gte(events.storageExpiresAt, startOfDay),
          lt(events.storageExpiresAt, endOfDay),
          isNull(events.deletedAt),
        ),
      );

    let enqueued = 0;
    for (const event of expiringEvents) {
      if (await this.alreadySent(event.id, 'storage_expiry_warning', today))
        continue;

      await this.emailQueue.add(
        JOB_NAMES.SEND_STORAGE_EXPIRY_WARNING,
        { eventId: event.id, daysRemaining: 7 },
        jobOptions(),
      );
      enqueued++;
    }

    this.logger.log({ enqueued }, 'Storage expiry warnings enqueued');
  }

  private async processPostWeddingSummaries() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentWeddings = await this.db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.weddingDate, dateStr),
          eq(events.status, 'active'),
          isNull(events.deletedAt),
        ),
      );

    let enqueued = 0;
    for (const event of recentWeddings) {
      if (await this.alreadySent(event.id, 'post_wedding_summary', today))
        continue;

      await this.emailQueue.add(
        JOB_NAMES.SEND_DAILY_DIGEST,
        { eventId: event.id, date: dateStr, isPostWeddingSummary: true },
        jobOptions(),
      );
      enqueued++;
    }

    this.logger.log({ enqueued }, 'Post-wedding summaries enqueued');
  }

  private async processCleanupJobs() {
    await this.cleanupQueue.add(
      JOB_NAMES.CLEANUP_EXPIRED_MEDIA,
      {},
      jobOptions(),
    );
    await this.cleanupQueue.add(
      JOB_NAMES.CLEANUP_ORPHAN_UPLOADS,
      {},
      jobOptions(),
    );
    this.logger.log('Cleanup jobs enqueued');
  }

  private async alreadySent(
    eventId: string,
    template: string,
    since: Date,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: emailLog.id })
      .from(emailLog)
      .where(
        and(
          eq(emailLog.eventId, eventId),
          eq(emailLog.template, template),
          eq(emailLog.status, 'sent'),
          gte(emailLog.sentAt, since),
        ),
      )
      .limit(1);
    return !!row;
  }
}
