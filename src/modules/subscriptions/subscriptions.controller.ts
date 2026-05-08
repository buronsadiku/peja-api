import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service.js';
import { PlansService } from '../plans/plans.service.js';
import { EventsService } from '../events/events.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
} from '../../common/swagger/global-errors.js';
import { SubscriptionWrapperDto } from './subscriptions.responses.js';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@ApiCommonErrors()
@Controller('api/v1/events/:eventId/subscription')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly plansService: PlansService,
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get active subscription for an event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Active subscription', SubscriptionWrapperDto)
  @ApiNotFoundError()
  async get(
    @CurrentUser('id') userId: string,
    @Param('eventId') eventId: string,
  ) {
    await this.eventsService.verifyOwnership(eventId, userId);
    const sub = await this.subscriptionsService.findActiveByEvent(eventId);
    if (!sub) return { data: { subscription: null } };

    const plan = await this.plansService.findById(sub.planId);
    return {
      data: {
        subscription: {
          id: sub.id,
          eventId: sub.eventId,
          planId: sub.planId,
          planCode: plan?.code ?? '',
          planName: plan?.name ?? '',
          status: sub.status,
          creditCentsRemaining: sub.creditCentsRemaining,
          activatedAt: sub.activatedAt.toISOString(),
          expiresAt: sub.expiresAt ? sub.expiresAt.toISOString() : null,
        },
      },
    };
  }
}
