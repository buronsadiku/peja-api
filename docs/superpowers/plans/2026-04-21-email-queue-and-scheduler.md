# Email Queue Wiring & Scheduler Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the existing email queue so emails send asynchronously on key events, and add a daily scheduler that triggers digests, reminders, and cleanup jobs.

**Architecture:** Two changes to the existing NestJS app. (1) Inject the BullMQ EMAIL queue into `PublicService` and `WebhooksService` and call `.add()` at the right moments. (2) Add a new `SchedulerModule` using `@nestjs/schedule` with a single daily cron that queries events and enqueues email/cleanup jobs.

**Tech Stack:** NestJS, BullMQ, `@nestjs/schedule`, Drizzle ORM, PostgreSQL, Redis

---

### Task 1: Install @nestjs/schedule

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && npm install @nestjs/schedule
```

- [ ] **Step 2: Verify installation**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && node -e "require('@nestjs/schedule')" && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && git add package.json package-lock.json && git commit -m "chore: add @nestjs/schedule dependency"
```

---

### Task 2: Wire email queue into PublicService (guest message → notification)

**Files:**
- Modify: `src/modules/public/public.module.ts`
- Modify: `src/modules/public/public.service.ts`

- [ ] **Step 1: Add BullModule queue registration to PublicModule**

In `src/modules/public/public.module.ts`, add the EMAIL queue import. The file currently imports `EventsModule, MessagesModule, QueueModule`. Add `BullModule` for the EMAIL queue:

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PublicController } from './public.controller.js';
import { PublicService } from './public.service.js';
import { EventsModule } from '../events/events.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

@Module({
  imports: [
    EventsModule,
    MessagesModule,
    QueueModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }),
  ],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
```

- [ ] **Step 2: Inject email queue and enqueue notification in PublicService**

In `src/modules/public/public.service.ts`, add the email queue injection to the constructor (line 24-31) and enqueue a notification after message creation (after line 160):

Add to constructor:
```typescript
constructor(
    private readonly eventsRepo: EventsRepository,
    private readonly messagesRepo: MessagesRepository,
    private readonly storage: StorageService,
    @InjectQueue(QUEUE_NAMES.TRANSCRIPTION)
    private readonly transcriptionQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MEDIA) private readonly mediaQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}
```

Add after the media queue jobs block (after line 160, before the logger.log call):

```typescript
    // Notify couple of new message
    await this.emailQueue.add(
      JOB_NAMES.SEND_NEW_MESSAGE_NOTIFICATION,
      { eventId: event.id, messageIds: [message.id] },
      jobOptions(),
    );
```

- [ ] **Step 3: Verify the app compiles**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && git add src/modules/public/public.module.ts src/modules/public/public.service.ts && git commit -m "feat: enqueue email notification when guest submits message"
```

---

### Task 3: Wire email queue into WebhooksService (payment success → confirmation)

**Files:**
- Modify: `src/modules/webhooks/webhooks.module.ts`
- Modify: `src/modules/webhooks/webhooks.service.ts`

- [ ] **Step 1: Add BullModule queue registration to WebhooksModule**

In `src/modules/webhooks/webhooks.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

@Module({
  imports: [
    PaymentsModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
```

- [ ] **Step 2: Inject email queue and enqueue confirmation in WebhooksService**

In `src/modules/webhooks/webhooks.service.ts`, add imports and inject the queue:

Add to imports (line 1-10):
```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { webhooksLog, orders, events } from '../../database/schema/index.js';
import type {
  PaymentProvider,
  ParsedWebhookEvent,
} from '../payments/payment-provider.interface.js';
import { PaymentsService } from '../payments/payments.service.js';
import { QUEUE_NAMES, JOB_NAMES } from '../queue/queue.constants.js';
import { jobOptions } from '../queue/queue.utils.js';
```

Add to constructor (line 16-21):
```typescript
  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    @Inject('PaymentProvider')
    private readonly paymentProvider: PaymentProvider,
    private readonly paymentsService: PaymentsService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}
```

Add email enqueue at end of `processPaymentSuccess` method, after the `activatePlan` call (after line 158, before the logger.log at line 160):

```typescript
    // Send purchase confirmation email
    await this.emailQueue.add(
      JOB_NAMES.SEND_PURCHASE_CONFIRMATION,
      { orderId: order.id },
      jobOptions(),
    );
```

- [ ] **Step 3: Verify the app compiles**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && git add src/modules/webhooks/webhooks.module.ts src/modules/webhooks/webhooks.service.ts && git commit -m "feat: enqueue purchase confirmation email on payment success"
```

---

### Task 4: Create SchedulerModule and SchedulerService

**Files:**
- Create: `src/modules/scheduler/scheduler.module.ts`
- Create: `src/modules/scheduler/scheduler.service.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Create scheduler.module.ts**

Create `src/modules/scheduler/scheduler.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service.js';
import { QUEUE_NAMES } from '../queue/queue.constants.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.CLEANUP },
    ),
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
```

- [ ] **Step 2: Create scheduler.service.ts**

Create `src/modules/scheduler/scheduler.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { eq, and, isNull, isNotNull, gte, lt, sql } from 'drizzle-orm';
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

    // Find events that received messages yesterday
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

      // Reuse daily digest job type with a flag, or send directly.
      // The post-wedding summary needs message/photo counts — the processor handles this.
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
```

- [ ] **Step 3: Register SchedulerModule in AppModule**

In `src/app.module.ts`, add the import (after line 34):

```typescript
import { SchedulerModule } from './modules/scheduler/scheduler.module.js';
```

Add `SchedulerModule` to the imports array (after `KeepsakesModule` on line 79):

```typescript
    KeepsakesModule,
    SchedulerModule,
    ThrottlerModule.forRoot([
```

- [ ] **Step 4: Verify the app compiles**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && git add src/modules/scheduler/scheduler.module.ts src/modules/scheduler/scheduler.service.ts src/app.module.ts && git commit -m "feat: add daily scheduler for email digests, reminders, and cleanup"
```

---

### Task 5: Verify emailLog is exported from schema index

**Files:**
- Modify (if needed): `src/database/schema/index.ts`

- [ ] **Step 1: Check that emailLog is exported from the schema barrel**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && grep -n "emailLog\|email-log\|email_log" src/database/schema/index.ts
```

If `emailLog` is not exported, add to `src/database/schema/index.ts`:

```typescript
export { emailLog } from './email-log.js';
```

- [ ] **Step 2: Verify the app compiles**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit (only if changes were made)**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && git add src/database/schema/index.ts && git commit -m "chore: export emailLog from schema index"
```

---

### Task 6: End-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Verify the full app builds**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 2: Verify the app starts (dry run)**

```bash
cd /Users/ariannimani/Documents/Vigan/suebws/peja-api && timeout 10 npm run start:dev 2>&1 || true
```

Expected: App bootstraps without module initialization errors. Look for `Nest application successfully started` or the scheduler registration log.

- [ ] **Step 3: Verify scheduler cron is registered**

In the startup logs, look for:
```
[SchedulerService] Daily scheduler started
```
(This won't appear unless it's 9am UTC — the cron registration itself is silent. The `ScheduleModule.forRoot()` import is sufficient to confirm registration.)

- [ ] **Step 4: Final commit (if any fixups needed)**

Only if previous steps required changes.
