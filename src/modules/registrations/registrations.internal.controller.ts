import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
} from '@nestjs/common';
import { RegistrationsService } from './registrations.service.js';

@Controller('v1/internal/registrations')
export class RegistrationsInternalController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Get('reminders/preview')
  async preview(@Headers('x-internal-token') token: string) {
    this.guard(token);
    return { data: await this.registrations.reminderRecipientsCount() };
  }

  @Post('reminders')
  @HttpCode(200)
  async send(@Headers('x-internal-token') token: string) {
    this.guard(token);
    return { data: await this.registrations.sendReminders() };
  }

  private guard(token: string) {
    const expected = process.env.INTERNAL_API_TOKEN;
    if (!expected) {
      throw new ForbiddenException({
        code: 'internal_api_disabled',
        message: 'INTERNAL_API_TOKEN not configured',
      });
    }
    if (token !== expected) {
      throw new ForbiddenException({
        code: 'invalid_internal_token',
        message: 'invalid internal token',
      });
    }
  }
}
