import { Injectable, Logger } from '@nestjs/common';

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
  }>;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendRegistrationConfirmation(
    payload: RegistrationEmailPayload,
  ): Promise<void> {
    const lines = [
      '',
      '═══════════════════════════════════════════',
      '[EMAIL MOCK] Registration confirmation',
      '═══════════════════════════════════════════',
      `To:      ${payload.to}`,
      `Subject: Peja Festival — registered for ${payload.date}`,
      '',
      `Hi ${payload.name},`,
      '',
      `You are registered for ${payload.date}. Your activities:`,
      '',
      ...payload.activities.map(
        (a) =>
          `  • ${a.name}\n    ${a.startTime}–${a.endTime}` +
          (a.location ? `\n    Location: ${a.location}` : '') +
          (a.meetingPoint ? `\n    Meeting point: ${a.meetingPoint}` : ''),
      ),
      '',
      'See you at the festival!',
      '═══════════════════════════════════════════',
      '',
    ];
    this.logger.log(lines.join('\n'));
  }
}
