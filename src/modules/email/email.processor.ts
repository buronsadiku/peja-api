import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq, and, isNull, sql, gte, lt } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import {
  events,
  users,
  messages,
  orders,
} from '../../database/schema/index.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { EmailService } from './email.service.js';

interface EmailPreferences {
  marketing: boolean;
  digest: boolean;
  alerts: boolean;
}

interface OrderMetadata {
  planTier?: string;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger('EmailProcessor');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job<Record<string, unknown>>): Promise<void> {
    switch (job.name) {
      case JOB_NAMES.SEND_NEW_MESSAGE_NOTIFICATION:
        return this.sendNewMessageNotification(
          job.data as { eventId: string; messageIds: string[] },
        );
      case JOB_NAMES.SEND_PURCHASE_CONFIRMATION:
        return this.sendPurchaseConfirmation(job.data as { orderId: string });
      case JOB_NAMES.SEND_DAILY_DIGEST:
        return this.sendDailyDigest(
          job.data as { eventId: string; date: string },
        );
      case JOB_NAMES.SEND_STORAGE_EXPIRY_WARNING:
        return this.sendStorageExpiryWarning(
          job.data as { eventId: string; daysRemaining: number },
        );
      case JOB_NAMES.SEND_WEDDING_DAY_CHECKLIST:
        return this.sendWeddingDayChecklist(job.data as { eventId: string });
      default:
        this.logger.warn({ jobName: job.name }, 'Unknown email job');
    }
  }

  private async sendNewMessageNotification(data: {
    eventId: string;
    messageIds: string[];
  }) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, data.eventId))
      .limit(1);
    if (!event) return;
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, event.ownerUserId))
      .limit(1);
    if (!user) return;

    const prefs = user.emailPreferences as EmailPreferences | null;
    if (prefs && !prefs.alerts) return;

    const msgs = await this.db
      .select()
      .from(messages)
      .where(
        and(eq(messages.eventId, data.eventId), isNull(messages.deletedAt)),
      )
      .orderBy(sql`${messages.createdAt} DESC`)
      .limit(5);

    const guestNames = msgs.map((m) => m.guestNames);
    await this.emailService.sendNewMessageAlert(
      user.email,
      `${event.partnerAName} & ${event.partnerBName}`,
      data.messageIds.length,
      guestNames,
      user.preferredLanguage,
      user.id,
      event.id,
    );
  }

  private async sendPurchaseConfirmation(data: { orderId: string }) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, data.orderId))
      .limit(1);
    if (!order) return;
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, order.userId))
      .limit(1);
    if (!user) return;

    const metadata = order.metadata as OrderMetadata | null;
    const planTier = metadata?.planTier || order.orderType;
    await this.emailService.sendPurchaseConfirmation(
      user.email,
      planTier,
      order.totalCents,
      order.currency,
      user.preferredLanguage,
      user.id,
      order.eventId,
    );
  }

  private async sendDailyDigest(data: { eventId: string; date: string }) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, data.eventId))
      .limit(1);
    if (!event) return;
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, event.ownerUserId))
      .limit(1);
    if (!user) return;

    const prefs = user.emailPreferences as EmailPreferences | null;
    if (prefs && !prefs.digest) return;

    const yesterday = new Date(data.date);
    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.eventId, data.eventId),
          isNull(messages.deletedAt),
          gte(messages.createdAt, yesterday),
          lt(messages.createdAt, today),
        ),
      );

    if (Number(count) === 0) return;

    await this.emailService.sendDailyDigest(
      user.email,
      `${event.partnerAName} & ${event.partnerBName}`,
      Number(count),
      user.preferredLanguage,
      user.id,
      event.id,
    );
  }

  private async sendStorageExpiryWarning(data: {
    eventId: string;
    daysRemaining: number;
  }) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, data.eventId))
      .limit(1);
    if (!event) return;
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, event.ownerUserId))
      .limit(1);
    if (!user) return;

    await this.emailService.sendStorageExpiryWarning(
      user.email,
      data.daysRemaining,
      user.preferredLanguage,
      user.id,
      event.id,
    );
  }

  private async sendWeddingDayChecklist(data: { eventId: string }) {
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, data.eventId))
      .limit(1);
    if (!event) return;
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, event.ownerUserId))
      .limit(1);
    if (!user) return;

    await this.emailService.sendWeddingDayChecklist(
      user.email,
      event.partnerAName,
      event.partnerBName,
      user.preferredLanguage,
      user.id,
      event.id,
    );
  }
}
