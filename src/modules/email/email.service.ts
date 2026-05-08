import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { emailLog } from '../../database/schema/index.js';
import { getEnv } from '../../config/env.js';
import { t } from '../../common/i18n/t.js';
import {
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../../common/constants.js';

const resolveLocale = (locale: string): SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(locale as SupportedLanguage)
    ? (locale as SupportedLanguage)
    : 'en';
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger('EmailService');
  private client: Resend | null = null;
  private fromAddress: string = '';
  private enabled = false;

  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {
    const env = getEnv();
    if (env.RESEND_API_KEY) {
      try {
        this.client = new Resend(env.RESEND_API_KEY);
        this.fromAddress = env.EMAIL_FROM || 'Peja <hello@peja.app>';
        this.enabled = true;
        this.logger.log('Resend email adapter initialized');
      } catch {
        this.logger.warn('Resend not available — email disabled');
      }
    } else {
      this.logger.warn('RESEND_API_KEY not set — email disabled');
    }
  }

  // --- Private: only place that touches Resend SDK ---

  private async send(params: {
    to: string;
    subject: string;
    html: string;
    template: string;
    language: string;
    userId?: string;
    eventId?: string;
  }): Promise<{ id: string } | null> {
    if (!this.enabled || !this.client) {
      this.logger.debug(
        { template: params.template },
        'Email skipped — not configured',
      );
      return null;
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (error) {
        this.logger.error(
          { error, template: params.template },
          'Email send failed',
        );
        await this.logEmail(params, 'failed', error.message);
        return null;
      }

      await this.logEmail(params, 'sent', undefined, data?.id);
      return { id: data?.id };
    } catch (err) {
      this.logger.error(
        { error: (err as Error).message, template: params.template },
        'Email send error',
      );
      await this.logEmail(params, 'failed', (err as Error).message);
      return null;
    }
  }

  private async logEmail(
    params: {
      to: string;
      template: string;
      language: string;
      userId?: string;
      eventId?: string;
    },
    status: string,
    error?: string,
    providerId?: string,
  ) {
    await this.db.insert(emailLog).values({
      userId: params.userId || null,
      eventId: params.eventId || null,
      template: params.template,
      toEmail: params.to,
      language: params.language,
      provider: 'resend',
      providerId: providerId || null,
      status,
      error: error || null,
      sentAt: status === 'sent' ? new Date() : null,
    });
  }

  // --- Public domain methods ---

  async sendWelcome(to: string, name: string, locale = 'en', userId?: string) {
    const lang = resolveLocale(locale);
    return this.send({
      to,
      subject: t('email:welcome.subject', lang),
      html: t('email:welcome.body', lang, { name }),
      template: 'welcome',
      language: lang,
      userId,
    });
  }

  async sendPurchaseConfirmation(
    to: string,
    planTier: string,
    totalCents: number,
    currency: string,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const amount = (totalCents / 100).toFixed(2);
    return this.send({
      to,
      subject: t('email:purchase_confirmation.subject', lang),
      html: t('email:purchase_confirmation.body', lang, {
        planTier,
        currency,
        amount,
      }),
      template: 'purchase_confirmation',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendNewMessageAlert(
    to: string,
    eventName: string,
    messageCount: number,
    guestNames: string[],
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const names = guestNames.slice(0, 3).join(', ');
    const andOthers =
      guestNames.length > 3
        ? t('email:new_message_alert.and_others', lang)
        : '';
    const isOne = messageCount === 1;
    const subject = t(
      isOne
        ? 'email:new_message_alert.subject_one'
        : 'email:new_message_alert.subject_other',
      lang,
      { count: String(messageCount) },
    );
    const body = t(
      isOne
        ? 'email:new_message_alert.body_one'
        : 'email:new_message_alert.body_other',
      lang,
      { count: String(messageCount), names, andOthers },
    );
    return this.send({
      to,
      subject,
      html: body,
      template: 'new_message_alert',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendDailyDigest(
    to: string,
    eventName: string,
    messageCount: number,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const params = { count: String(messageCount) };
    return this.send({
      to,
      subject: t('email:daily_digest.subject', lang, params),
      html: t('email:daily_digest.body', lang, params),
      template: 'daily_digest',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendWeddingDayChecklist(
    to: string,
    partnerAName: string,
    partnerBName: string,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const params = { partnerA: partnerAName, partnerB: partnerBName };
    return this.send({
      to,
      subject: t('email:wedding_day_checklist.subject', lang, params),
      html: t('email:wedding_day_checklist.body', lang, params),
      template: 'wedding_day_checklist',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendStorageExpiryWarning(
    to: string,
    daysRemaining: number,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const params = { days: String(daysRemaining) };
    return this.send({
      to,
      subject: t('email:storage_expiry_warning.subject', lang, params),
      html: t('email:storage_expiry_warning.body', lang, params),
      template: 'storage_expiry_warning',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendStorageExpired(
    to: string,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    return this.send({
      to,
      subject: t('email:storage_expired.subject', lang),
      html: t('email:storage_expired.body', lang),
      template: 'storage_expired',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendOrderShipped(
    to: string,
    productName: string,
    carrier: string,
    trackingUrl: string,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const params = { productName, carrier, trackingUrl };
    return this.send({
      to,
      subject: t('email:order_shipped.subject', lang, params),
      html: t('email:order_shipped.body', lang, params),
      template: 'order_shipped',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendOrderDelivered(
    to: string,
    productName: string,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const params = { productName };
    return this.send({
      to,
      subject: t('email:order_delivered.subject', lang, params),
      html: t('email:order_delivered.body', lang, params),
      template: 'order_delivered',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendRefundConfirmation(
    to: string,
    amountCents: number,
    currency: string,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const amount = (amountCents / 100).toFixed(2);
    const params = { currency, amount };
    return this.send({
      to,
      subject: t('email:refund_confirmation.subject', lang),
      html: t('email:refund_confirmation.body', lang, params),
      template: 'refund_confirmation',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendAccountDeletionConfirmation(
    to: string,
    locale = 'en',
    userId?: string,
  ) {
    const lang = resolveLocale(locale);
    return this.send({
      to,
      subject: t('email:account_deletion_confirmation.subject', lang),
      html: t('email:account_deletion_confirmation.body', lang),
      template: 'account_deletion_confirmation',
      language: lang,
      userId,
    });
  }

  async sendWeddingWeekReminder(
    to: string,
    partnerAName: string,
    partnerBName: string,
    daysUntil: number,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const params = { days: String(daysUntil) };
    return this.send({
      to,
      subject: t('email:wedding_week_reminder.subject', lang, params),
      html: t('email:wedding_week_reminder.body', lang, params),
      template: 'wedding_week_reminder',
      language: lang,
      userId,
      eventId,
    });
  }

  async sendPostWeddingSummary(
    to: string,
    messageCount: number,
    photoCount: number,
    locale = 'en',
    userId?: string,
    eventId?: string,
  ) {
    const lang = resolveLocale(locale);
    const params = {
      messageCount: String(messageCount),
      photoCount: String(photoCount),
    };
    return this.send({
      to,
      subject: t('email:post_wedding_summary.subject', lang),
      html: t('email:post_wedding_summary.body', lang, params),
      template: 'post_wedding_summary',
      language: lang,
      userId,
      eventId,
    });
  }
}
