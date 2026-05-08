import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InvitationsRepository } from './invitations.repository.js';
import { EventOwnerGuard } from '../../common/guards/event-owner.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { z } from 'zod';

const createInvitationSchema = z
  .object({
    channel: z.enum([
      'whatsapp',
      'email',
      'sms',
      'link',
      'qr_print',
      'ig_story',
    ]),
    recipient: z.string().max(200).optional(),
  })
  .strict();

@ApiTags('Invitations')
@ApiBearerAuth()
@Controller('api/v1/events/:eventId/invitations')
@UseGuards(EventOwnerGuard)
export class InvitationsController {
  constructor(private readonly repo: InvitationsRepository) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record invitation send' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({ status: 201, description: 'Invitation recorded' })
  async create(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(createInvitationSchema))
    body: { channel: string; recipient?: string },
  ) {
    const invitation = await this.repo.create({
      eventId,
      channel: body.channel,
      recipient: body.recipient,
    });
    return { data: { invitation } };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get invitation funnel stats' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Invitation statistics' })
  async stats(@Param('eventId') eventId: string) {
    const stats = await this.repo.getStatsByEvent(eventId);
    return { data: stats };
  }
}
