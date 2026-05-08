import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller.js';
import { InvitationsRepository } from './invitations.repository.js';
import { EventsModule } from '../events/events.module.js';

@Module({
  imports: [EventsModule],
  controllers: [InvitationsController],
  providers: [InvitationsRepository],
  exports: [InvitationsRepository],
})
export class InvitationsModule {}
