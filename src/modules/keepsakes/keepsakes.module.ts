import { Module } from '@nestjs/common';
import { KeepsakesController } from './keepsakes.controller.js';
import { KeepsakesService } from './keepsakes.service.js';
import { KeepsakesProcessor } from './keepsakes.processor.js';
import { ProductsRepository } from './products.repository.js';
import { RendersRepository } from './renders.repository.js';
import { CustomizationValidatorService } from './customization-validator.service.js';
import { EventsModule } from '../events/events.module.js';
import { QueueModule } from '../queue/queue.module.js';
import { CreditsModule } from '../credits/credits.module.js';
import { PromotionsModule } from '../promotions/promotions.module.js';
import { VendorsModule } from '../vendors/vendors.module.js';

@Module({
  imports: [
    EventsModule,
    QueueModule,
    CreditsModule,
    PromotionsModule,
    VendorsModule,
  ],
  controllers: [KeepsakesController],
  providers: [
    KeepsakesService,
    KeepsakesProcessor,
    ProductsRepository,
    RendersRepository,
    CustomizationValidatorService,
  ],
  exports: [
    KeepsakesService,
    ProductsRepository,
    RendersRepository,
    CustomizationValidatorService,
  ],
})
export class KeepsakesModule {}
