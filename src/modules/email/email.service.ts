import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { getEnv } from '../../config/env.js';

export type ActivityEmailItem = {
  name: string;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingPoint: string | null;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  contactPhone1: string | null;
  contactPhone2: string | null;
};

export type RegistrationEmailDay = {
  date: string;
  dayLabel: string | null;
  activities: ActivityEmailItem[];
};

export type RegistrationEmailPayload = {
  to: string;
  name: string;
  days: RegistrationEmailDay[];
};

const REMINDER_CONTACT_EMAIL = 'info@pejaoutdoorfestival.org';

const buildMapsUrl = (a: {
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  location: string | null;
}): string | null => {
  if (a.latitude && a.longitude) {
    return `https://www.google.com/maps?q=${a.latitude},${a.longitude}`;
  }
  const query = a.address ?? a.location;
  if (query && query.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return null;
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDateHeader = (date: string, label: string | null): string => {
  if (label && label.trim()) return `${label} · ${date}`;
  return date;
};

const buildText = (p: RegistrationEmailPayload): string => {
  const block = (lang: 'en' | 'sq') => {
    const labels =
      lang === 'sq'
        ? {
            greeting: `Përshëndetje ${p.name},`,
            intro:
              p.days.length > 1
                ? `Je regjistruar për ${p.days.length} ditë. Orari yt:`
                : `Je regjistruar për ${formatDateHeader(p.days[0]?.date ?? '', p.days[0]?.dayLabel ?? null)}. Aktivitetet e tua:`,
            location: 'Vendndodhja',
            meetingPoint: 'Pika e takimit',
            map: 'Hapni në Google Maps',
            contact: 'Kontakti',
            outro: 'Shihemi në festival!',
            sign: '— Peja Outdoor Festival',
          }
        : {
            greeting: `Hi ${p.name},`,
            intro:
              p.days.length > 1
                ? `You are registered for ${p.days.length} days. Your schedule:`
                : `You are registered for ${formatDateHeader(p.days[0]?.date ?? '', p.days[0]?.dayLabel ?? null)}. Your activities:`,
            location: 'Location',
            meetingPoint: 'Meeting point',
            map: 'Open in Google Maps',
            contact: 'Contact',
            outro: 'See you at the festival!',
            sign: '— Peja Outdoor Festival',
          };

    const daySections = p.days
      .map((d) => {
        const header =
          p.days.length > 1
            ? [`▸ ${formatDateHeader(d.date, d.dayLabel)}`, '']
            : [];
        const acts = d.activities
          .map((a) => {
            const lines = [
              `  • ${a.name}`,
              `    ${a.startTime}–${a.endTime}`,
            ];
            if (a.location)
              lines.push(`    ${labels.location}: 📍 ${a.location}`);
            if (a.meetingPoint)
              lines.push(`    ${labels.meetingPoint}: 🚩 ${a.meetingPoint}`);
            const mapsUrl = buildMapsUrl(a);
            if (mapsUrl) lines.push(`    ${labels.map}: 🗺️ ${mapsUrl}`);
            const phones = [a.contactPhone1, a.contactPhone2].filter(
              (v): v is string => Boolean(v && v.trim()),
            );
            if (phones.length > 0) {
              lines.push(`    ${labels.contact}: 📞 ${phones.join(' · ')}`);
            }
            return lines.join('\n');
          })
          .join('\n');
        return [...header, acts].join('\n');
      })
      .join('\n\n');

    return [
      labels.greeting,
      '',
      labels.intro,
      '',
      daySections,
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
  const renderDays = (lang: 'en' | 'sq') => {
    const labels =
      lang === 'sq'
        ? {
            location: 'Vendndodhja',
            meetingPoint: 'Pika e takimit',
            map: 'Hapni në Google Maps',
            contact: 'Kontakti',
          }
        : {
            location: 'Location',
            meetingPoint: 'Meeting point',
            map: 'Open in Google Maps',
            contact: 'Contact',
          };

    return p.days
      .map((d) => {
        const items = d.activities
          .map((a) => {
            const loc = a.location
              ? `<div style="color:#666;font-size:13px;margin-top:4px;"><strong>${labels.location}:</strong> 📍 ${escapeHtml(a.location)}</div>`
              : '';
            const mp = a.meetingPoint
              ? `<div style="color:#666;font-size:13px;margin-top:2px;"><strong>${labels.meetingPoint}:</strong> 🚩 ${escapeHtml(a.meetingPoint)}</div>`
              : '';
            const mapsUrl = buildMapsUrl(a);
            const map = mapsUrl
              ? `<div style="margin-top:8px;"><a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" style="display:inline-block;background:#f0bc00;color:#111;font-weight:600;font-size:13px;text-decoration:none;padding:8px 14px;border-radius:6px;">🗺️ ${labels.map}</a></div>`
              : '';
            const phones = [a.contactPhone1, a.contactPhone2].filter(
              (v): v is string => Boolean(v && v.trim()),
            );
            const phoneLinks = phones
              .map(
                (ph) =>
                  `<a href="tel:${escapeHtml(ph.replace(/\s+/g, ''))}" style="color:#0066cc;text-decoration:none;">${escapeHtml(ph)}</a>`,
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
                ${loc}${mp}${contact}${map}
              </li>`;
          })
          .join('');

        const dayHeader = `
          <div style="margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #111;">
            <div style="font-weight:900;font-size:16px;color:#111;letter-spacing:0.5px;">${escapeHtml(formatDateHeader(d.date, d.dayLabel))}</div>
          </div>`;

        return `${dayHeader}<ul style="margin:0;padding:0;">${items}</ul>`;
      })
      .join('');
  };

  const englishBlock = `
        <p style="margin:0 0 12px;font-size:16px;">Hi ${escapeHtml(p.name)},</p>
        <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.5;">
          ${
            p.days.length > 1
              ? `You're registered for <strong>${p.days.length} days</strong>. Here's your schedule:`
              : `You're registered for <strong>${escapeHtml(formatDateHeader(p.days[0]?.date ?? '', p.days[0]?.dayLabel ?? null))}</strong>. Here's your schedule:`
          }
        </p>
        ${renderDays('en')}
        <p style="margin:24px 0 0;font-size:14px;color:#555;">See you at the festival!</p>`;

  const albanianBlock = `
        <p style="margin:0 0 12px;font-size:16px;">Përshëndetje ${escapeHtml(p.name)},</p>
        <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.5;">
          ${
            p.days.length > 1
              ? `Je regjistruar për <strong>${p.days.length} ditë</strong>. Ja orari yt:`
              : `Je regjistruar për <strong>${escapeHtml(formatDateHeader(p.days[0]?.date ?? '', p.days[0]?.dayLabel ?? null))}</strong>. Ja orari yt:`
          }
        </p>
        ${renderDays('sq')}
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

const renderReminderTextDays = (
  lang: 'en' | 'sq',
  days: RegistrationEmailDay[],
): string => {
  const labels =
    lang === 'sq'
      ? {
          location: 'Vendndodhja',
          meetingPoint: 'Pika e takimit',
          map: 'Hapni në Google Maps',
          contact: 'Kontakti',
        }
      : {
          location: 'Location',
          meetingPoint: 'Meeting point',
          map: 'Open in Google Maps',
          contact: 'Contact',
        };

  return days
    .map((d) => {
      const header =
        days.length > 1 ? [`▸ ${formatDateHeader(d.date, d.dayLabel)}`, ''] : [];
      const acts = d.activities
        .map((a) => {
          const lines = [`  • ${a.name}`, `    ${a.startTime}–${a.endTime}`];
          if (a.location)
            lines.push(`    ${labels.location}: 📍 ${a.location}`);
          if (a.meetingPoint)
            lines.push(`    ${labels.meetingPoint}: 🚩 ${a.meetingPoint}`);
          const mapsUrl = buildMapsUrl(a);
          if (mapsUrl) lines.push(`    ${labels.map}: 🗺️ ${mapsUrl}`);
          const phones = [a.contactPhone1, a.contactPhone2].filter(
            (v): v is string => Boolean(v && v.trim()),
          );
          if (phones.length > 0) {
            lines.push(`    ${labels.contact}: 📞 ${phones.join(' · ')}`);
          }
          return lines.join('\n');
        })
        .join('\n');
      return [...header, acts].join('\n');
    })
    .join('\n\n');
};

const buildReminderText = (p: RegistrationEmailPayload): string => {
  const block = (lang: 'en' | 'sq') => {
    const labels =
      lang === 'sq'
        ? {
            greeting: `Përshëndetje ${p.name},`,
            intro:
              'Ky është një përkujtues për aktivitetet që ke zgjedhur në Peja Outdoor Festival. Ja orari yt:',
            cantAttend: `Nëse nuk mund të marrësh pjesë, të lutemi na njofto në ${REMINDER_CONTACT_EMAIL} që të lirohet vendi yt.`,
            outro: 'Shihemi së shpejti!',
            sign: '— Peja Outdoor Festival',
          }
        : {
            greeting: `Hi ${p.name},`,
            intro:
              "This is a friendly reminder of the activities you registered for at Peja Outdoor Festival. Here's your schedule:",
            cantAttend: `If you can't attend, please let us know by emailing ${REMINDER_CONTACT_EMAIL} so we can free your spot.`,
            outro: 'See you soon!',
            sign: '— Peja Outdoor Festival',
          };

    return [
      labels.greeting,
      '',
      labels.intro,
      '',
      labels.cantAttend,
      '',
      renderReminderTextDays(lang, p.days),
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

const buildReminderHtml = (p: RegistrationEmailPayload): string => {
  const renderDays = (lang: 'en' | 'sq') => {
    const labels =
      lang === 'sq'
        ? {
            location: 'Vendndodhja',
            meetingPoint: 'Pika e takimit',
            map: 'Hapni në Google Maps',
            contact: 'Kontakti',
          }
        : {
            location: 'Location',
            meetingPoint: 'Meeting point',
            map: 'Open in Google Maps',
            contact: 'Contact',
          };

    return p.days
      .map((d) => {
        const items = d.activities
          .map((a) => {
            const loc = a.location
              ? `<div style="color:#666;font-size:13px;margin-top:4px;"><strong>${labels.location}:</strong> 📍 ${escapeHtml(a.location)}</div>`
              : '';
            const mp = a.meetingPoint
              ? `<div style="color:#666;font-size:13px;margin-top:2px;"><strong>${labels.meetingPoint}:</strong> 🚩 ${escapeHtml(a.meetingPoint)}</div>`
              : '';
            const mapsUrl = buildMapsUrl(a);
            const map = mapsUrl
              ? `<div style="margin-top:8px;"><a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener" style="display:inline-block;background:#f0bc00;color:#111;font-weight:600;font-size:13px;text-decoration:none;padding:8px 14px;border-radius:6px;">🗺️ ${labels.map}</a></div>`
              : '';
            const phones = [a.contactPhone1, a.contactPhone2].filter(
              (v): v is string => Boolean(v && v.trim()),
            );
            const phoneLinks = phones
              .map(
                (ph) =>
                  `<a href="tel:${escapeHtml(ph.replace(/\s+/g, ''))}" style="color:#0066cc;text-decoration:none;">${escapeHtml(ph)}</a>`,
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
                ${loc}${mp}${contact}${map}
              </li>`;
          })
          .join('');

        const dayHeader = `
          <div style="margin:24px 0 12px;padding-bottom:8px;border-bottom:2px solid #111;">
            <div style="font-weight:900;font-size:16px;color:#111;letter-spacing:0.5px;">${escapeHtml(formatDateHeader(d.date, d.dayLabel))}</div>
          </div>`;

        return `${dayHeader}<ul style="margin:0;padding:0;">${items}</ul>`;
      })
      .join('');
  };

  const cancelEmailHref = `mailto:${REMINDER_CONTACT_EMAIL}?subject=${encodeURIComponent('Festival registration — unable to attend')}`;

  const englishBlock = `
        <p style="margin:0 0 12px;font-size:16px;">Hi ${escapeHtml(p.name)},</p>
        <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.5;">
          This is a friendly reminder of the activities you registered for at <strong>Peja Outdoor Festival</strong>. Here's your schedule:
        </p>
        <div style="background:#fff8e1;border-left:4px solid #f0bc00;padding:12px 16px;border-radius:6px;margin:0 0 16px;font-size:14px;color:#333;line-height:1.5;">
          <strong>If you can't attend</strong>, please let us know by emailing
          <a href="${cancelEmailHref}" style="color:#0066cc;text-decoration:none;font-weight:600;">${REMINDER_CONTACT_EMAIL}</a>
          so we can free your spot.
        </div>
        ${renderDays('en')}
        <p style="margin:24px 0 0;font-size:14px;color:#555;">See you soon!</p>`;

  const albanianBlock = `
        <p style="margin:0 0 12px;font-size:16px;">Përshëndetje ${escapeHtml(p.name)},</p>
        <p style="margin:0 0 12px;font-size:15px;color:#333;line-height:1.5;">
          Ky është një përkujtues për aktivitetet që ke zgjedhur në <strong>Peja Outdoor Festival</strong>. Ja orari yt:
        </p>
        <div style="background:#fff8e1;border-left:4px solid #f0bc00;padding:12px 16px;border-radius:6px;margin:0 0 16px;font-size:14px;color:#333;line-height:1.5;">
          <strong>Nëse nuk mund të marrësh pjesë</strong>, të lutemi na njofto në
          <a href="${cancelEmailHref}" style="color:#0066cc;text-decoration:none;font-weight:600;">${REMINDER_CONTACT_EMAIL}</a>
          që të lirohet vendi yt.
        </div>
        ${renderDays('sq')}
        <p style="margin:24px 0 0;font-size:14px;color:#555;">Shihemi së shpejti!</p>`;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="background:#111;padding:24px 32px;">
          <div style="color:#f0bc00;font-weight:900;font-size:24px;letter-spacing:0.5px;">PEJA OUTDOOR FESTIVAL</div>
          <div style="color:#fafafa;font-size:13px;margin-top:4px;">Friendly reminder · Përkujtues</div>
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
    if (payload.days.length === 0) return;
    const env = getEnv();
    const client = this.getClient();
    const subject =
      payload.days.length > 1
        ? `Peja Outdoor Festival — registered for ${payload.days.length} days`
        : `Peja Outdoor Festival — registered for ${payload.days[0].date}`;

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

  async sendRegistrationReminder(
    payload: RegistrationEmailPayload,
  ): Promise<{ ok: boolean }> {
    if (payload.days.length === 0) return { ok: false };
    const env = getEnv();
    const client = this.getClient();
    const subject =
      'Peja Outdoor Festival — Reminder: your upcoming activities';

    if (!client || !env.EMAIL_FROM) {
      this.logger.log(
        [
          '',
          '═══════════════════════════════════════════',
          '[EMAIL MOCK] Registration reminder',
          '═══════════════════════════════════════════',
          `To:      ${payload.to}`,
          `Subject: ${subject}`,
          '',
          buildReminderText(payload),
          '═══════════════════════════════════════════',
          '',
        ].join('\n'),
      );
      if (client && !env.EMAIL_FROM) {
        this.logger.warn(
          'RESEND_API_KEY set but EMAIL_FROM missing — reminder not sent',
        );
      }
      return { ok: false };
    }

    try {
      const { error } = await client.emails.send({
        from: env.EMAIL_FROM,
        to: payload.to,
        subject,
        html: buildReminderHtml(payload),
        text: buildReminderText(payload),
      });
      if (error) {
        this.logger.error(
          { err: error, to: payload.to },
          'resend reminder send failed',
        );
        return { ok: false };
      }
      this.logger.log(`reminder email sent to ${payload.to}`);
      return { ok: true };
    } catch (err) {
      this.logger.error(
        { err, to: payload.to },
        'resend reminder send threw',
      );
      return { ok: false };
    }
  }
}
