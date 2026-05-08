import { Module } from '@nestjs/common';
import { CreditsService } from './credits.service.js';
import { CreditsReconciliationService } from './credits-reconciliation.service.js';

@Module({
  providers: [CreditsService, CreditsReconciliationService],
  exports: [CreditsService, CreditsReconciliationService],
})
export class CreditsModule {}
