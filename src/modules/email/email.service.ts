import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { getEnv } from '../../config/env.js';

export type RegistrationEmailPayload = {
  to: string;
  name: string;
  date: string;
  activities: Array<{
    name: string;
    startTime: string;
    endTime: string;
    location: string | null;
    meetingPoint: string | null;
    contactPhone1: string | null;
    contactPhone2: string | null;
  }>;
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildText = (p: RegistrationEmailPayload): string => {
  const block = (lang: 'en' | 'sq') => {
    const labels =
      lang === 'sq'
        ? {
            greeting: `Përshëndetje ${p.name},`,
            intro: `Je regjistruar për ${p.date}. Aktivitetet e tua:`,
            location: 'Vendndodhja',
            meetingPoint: 'Pika e takimit',
            contact: 'Kontakti',
            outro: 'Shihemi në festival!',
            sign: '— Peja Outdoor Festival',
          }
        : {
            greeting: `Hi ${p.name},`,
            intro: `You are registered for ${p.date}. Your activities:`,
            location: 'Location',
            meetingPoint: 'Meeting point',
            contact: 'Contact',
            outro: 'See you at the festival!',
            sign: '— Peja Outdoor Festival',
          };

    const acts = p.activities
      .map((a) => {
        const lines = [
          `  • ${a.name}`,
          `    ${a.startTime}–${a.endTime}`,
        ];
        if (a.location)
          lines.push(`    ${labels.location}: 📍 ${a.location}`);
        if (a.meetingPoint)
          lines.push(`    ${labels.meetingPoint}: 🚩 ${a.meetingPoint}`);
        const phones = [a.contactPhone1, a.contactPhone2].filter(
          (v): v is string => Boolean(v && v.trim()),
        );
        if (phones.length > 0) {
          lines.push(`    ${labels.contact}: 📞 ${phones.join(' · ')}`);
        }
        return lines.join('\n');
      })
      .join('\n');

    return [
      labels.greeting,
      '',
      labels.intro,
      '',
      acts,
      '',
      labels.outro,
      labels.sign,
    ].join('\n');
  };

  return [
    block('en'),
    '',
    '───────────────────────────────',
    '',
    block('sq'),
  ].join('\n');
};

const buildHtml = (p: RegistrationEmailPayload): string => {
  const renderList = (lang: 'en' | 'sq') => {
    const labels =
      lang === 'sq'
        ? {
            location: 'Vendndodhja',
            meetingPoint: 'Pika e takimit',
            contact: 'Kontakti',
          }
        : {
            location: 'Location',
            meetingPoint: 'Meeting point',
            contact: 'Contact',
          };

    return p.activities
      .map((a) => {
        const loc = a.location
          ? `<div style="color:#666;font-size:13px;margin-top:4px;"><strong>${labels.location}:</strong> 📍 ${escapeHtml(a.location)}</div>`
          : '';
        const mp = a.meetingPoint
          ? `<div style="color:#666;font-size:13px;margin-top:2px;"><strong>${labels.meetingPoint}:</strong> 🚩 ${escapeHtml(a.meetingPoint)}</div>`
          : '';
        const phones = [a.contactPhone1, a.contactPhone2].filter(
          (v): v is string => Boolean(v && v.trim()),
        );
        const phoneLinks = phones
          .map(
            (p) =>
              `<a href="tel:${escapeHtml(p.replace(/\s+/g, ''))}" style="color:#0066cc;text-decoration:none;">${escapeHtml(p)}</a>`,
          )
          .join(' · ');
        const contact =
          phones.length > 0
            ? `<div style="color:#666;font-size:13px;margin-top:2px;"><strong>${labels.contact}:</strong> 📞 ${phoneLinks}</div>`
            : '';
        return `
          <li style="background:#f7f7f5;border-left:4px solid #f0bc00;padding:12px 16px;margin-bottom:10px;border-radius:6px;list-style:none;">
            <div style="font-weight:700;font-size:15px;color:#111;">${escapeHtml(a.name)}</div>
            <div style="color:#444;font-size:13px;margin-top:4px;">${escapeHtml(a.startTime)}–${escapeHtml(a.endTime)}</div>
            ${loc}${mp}${contact}
          </li>`;
      })
      .join('');
  };

  const englishBlock = `
        <p style="margin:0 0 12px;font-size:16px;">Hi ${escapeHtml(p.name)},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.5;">
          You're registered for <strong>${escapeHtml(p.date)}</strong>. Here's your schedule:
        </p>
        <ul style="margin:0;padding:0;">${renderList('en')}</ul>
        <p style="margin:24px 0 0;font-size:14px;color:#555;">See you at the festival!</p>`;

  const albanianBlock = `
        <p style="margin:0 0 12px;font-size:16px;">Përshëndetje ${escapeHtml(p.name)},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#333;line-height:1.5;">
          Je regjistruar për <strong>${escapeHtml(p.date)}</strong>. Ja orari yt:
        </p>
        <ul style="margin:0;padding:0;">${renderList('sq')}</ul>
        <p style="margin:24px 0 0;font-size:14px;color:#555;">Shihemi në festival!</p>`;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="background:#111;padding:24px 32px;">
          <div style="color:#f0bc00;font-weight:900;font-size:24px;letter-spacing:0.5px;">PEJA OUTDOOR FESTIVAL</div>
          <div style="color:#fafafa;font-size:13px;margin-top:4px;">Registration confirmed · Regjistrimi është konfirmuar</div>
        </td></tr>
        <tr><td style="padding:32px;">${englishBlock}</td></tr>
        <tr><td style="border-top:1px solid #e5e5e5;padding:0 32px;">
          <div style="text-align:center;color:#999;font-size:11px;letter-spacing:1px;padding:16px 0;">SHQIP</div>
        </td></tr>
        <tr><td style="padding:0 32px 32px;">${albanianBlock}</td></tr>
        <tr><td style="background:#f7f7f5;padding:16px 32px;color:#888;font-size:12px;text-align:center;">
          Peja Outdoor Festival · Peja, Kosovo
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private client: Resend | null = null;

  private getClient(): Resend | null {
    if (this.client) return this.client;
    const env = getEnv();
    if (!env.RESEND_API_KEY) return null;
    this.client = new Resend(env.RESEND_API_KEY);
    return this.client;
  }

  async sendRegistrationConfirmation(
    payload: RegistrationEmailPayload,
  ): Promise<void> {
    const env = getEnv();
    const client = this.getClient();
    const subject = `Peja Outdoor Festival — registered for ${payload.date}`;

    if (!client || !env.EMAIL_FROM) {
      this.logger.log(
        [
          '',
          '═══════════════════════════════════════════',
          '[EMAIL MOCK] Registration confirmation',
          '═══════════════════════════════════════════',
          `To:      ${payload.to}`,
          `Subject: ${subject}`,
          '',
          buildText(payload),
          '═══════════════════════════════════════════',
          '',
        ].join('\n'),
      );
      if (client && !env.EMAIL_FROM) {
        this.logger.warn(
          'RESEND_API_KEY set but EMAIL_FROM missing — email not sent',
        );
      }
      return;
    }

    try {
      const { error } = await client.emails.send({
        from: env.EMAIL_FROM,
        to: payload.to,
        subject,
        html: buildHtml(payload),
        text: buildText(payload),
      });
      if (error) {
        this.logger.error(
          { err: error, to: payload.to },
          'resend send failed',
        );
        return;
      }
      this.logger.log(`registration email sent to ${payload.to}`);
    } catch (err) {
      this.logger.error(
        { err, to: payload.to },
        'resend send threw',
      );
    }
  }
}
