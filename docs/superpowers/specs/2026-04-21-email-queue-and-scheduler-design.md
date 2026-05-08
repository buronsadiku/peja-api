# Email Queue Wiring & Scheduler Service

**Date:** 2026-04-21
**Scope:** Wire up existing email queue infrastructure + add daily scheduled jobs

## Context

Peja API has email sending infrastructure (Resend SDK, 13 templates, BullMQ EMAIL queue, email processor) that is fully built but not connected. The email processor handles 5 job types but nothing enqueues jobs. Additionally, there is no scheduling system for time-based notifications required by the spec (daily digest, wedding reminders, storage expiry warnings).

## Feature 1: Wire Up Email Queue

### Goal

Connect existing services to the EMAIL queue so emails are sent asynchronously with retry support.

### Trigger Points

| Trigger | Service File | Method | Email Job |
|---------|-------------|--------|-----------|
| Guest submits message | `public.service.ts` | `createMessage()` | `SEND_NEW_MESSAGE_NOTIFICATION` |
| Plan payment succeeds | `payments.service.ts` | `activatePlan()` | `SEND_PURCHASE_CONFIRMATION` |
| Keepsake order paid | `payments.service.ts` | webhook handler | `SEND_PURCHASE_CONFIRMATION` |

### Changes Required

- **`public.module.ts`** — import `BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL })`
- **`public.service.ts`** — inject `@InjectQueue(QUEUE_NAMES.EMAIL)`, call `.add()` after `createMessage()` succeeds
- **`payments.module.ts`** — import `BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL })`
- **`payments.service.ts`** — inject queue, enqueue after `activatePlan()` and keepsake order completion
- **`email.module.ts`** — verify `EmailProcessor` is properly registered

### Job Payload

```typescript
emailQueue.add(JOB_TYPES.SEND_NEW_MESSAGE_NOTIFICATION, {
  eventId: string,
  userId: string,
  messageId: string,
});

emailQueue.add(JOB_TYPES.SEND_PURCHASE_CONFIRMATION, {
  eventId: string,
  userId: string,
  orderId: string,
});
```

The existing `email.processor.ts` fetches event details, user preferences, and message data from the DB. No changes needed to the processor.

## Feature 2: Scheduler Service

### Goal

Add a daily cron job that checks all active events and dispatches the right email and cleanup jobs.

### New Package

- `@nestjs/schedule` (with `cron` peer dependency)

### New Files

- `src/modules/scheduler/scheduler.module.ts`
- `src/modules/scheduler/scheduler.service.ts`

### Cron Schedule

Single daily cron at **9:00 AM UTC**.

### Methods

| Method | DB Query | Action |
|--------|----------|--------|
| `processNewMessageDigests()` | Events with messages created yesterday, user has `emailPreferences.digest: true` | Enqueue `SEND_DAILY_DIGEST` |
| `processWeddingWeekReminders()` | Events with `weddingDate` = 7 days from now | Enqueue `SEND_WEDDING_DAY_CHECKLIST` |
| `processWeddingDayReminders()` | Events with `weddingDate` = today | Enqueue `SEND_WEDDING_DAY_CHECKLIST` |
| `processStorageExpiryWarnings()` | Events where `storageExpiresAt` is 7 days from now | Enqueue `SEND_STORAGE_EXPIRY_WARNING` |
| `processPostWeddingSummaries()` | Events with `weddingDate` = yesterday, summary not yet sent | Call `EmailService.sendPostWeddingSummary()` via queue |
| `processExpiredMediaCleanup()` | Always runs | Enqueue `CLEANUP_EXPIRED_MEDIA` and `CLEANUP_ORPHAN_UPLOADS` to cleanup queue |

### Duplicate Prevention

Before enqueuing any email job, check the `email_log` table:

```sql
WHERE eventId = :eventId AND template = :template AND sentAt >= :todayStart
```

If a matching row exists, skip. This prevents duplicate sends on cron retries or overlapping runs.

### Module Registration

```typescript
// scheduler.module.ts
@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.CLEANUP },
    ),
    EmailModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
```

`SchedulerModule` imported in `app.module.ts`.

## Out of Scope

- Push notifications (Peja is a webapp, email is the notification channel)
- Batch sync endpoint (frontend handles queue drain with idempotency keys)
- Entitlements system (already implemented: message limits, storage expiry, plan gating)
- New email templates (all 13 already exist)

## Testing

- Unit test scheduler methods with mocked repositories and queues
- Verify duplicate prevention logic
- Integration test: enqueue email job → processor sends email → logged in email_log
