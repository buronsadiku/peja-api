import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { EventsService } from '../../modules/events/events.service.js';
import type { PejaRequest } from '../types/request.js';

@Injectable()
export class EventOwnerGuard implements CanActivate {
  constructor(private readonly eventsService: EventsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<PejaRequest>();
    const eventId = request.params.eventId as string | undefined;
    const userId = request.currentUser?.id;

    if (!eventId || !userId) return false;

    const event = await this.eventsService.verifyOwnership(eventId, userId);
    request.currentEvent = event;
    return true;
  }
}
