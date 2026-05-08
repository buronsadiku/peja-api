import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaymentsService } from './payments.service.js';
import {
  checkoutSessionSchema,
  CheckoutSessionDto,
} from './payments.schemas.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiValidationError,
} from '../../common/swagger/global-errors.js';
import { CheckoutResultDto } from './payments.responses.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout-session')
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  @ApiSuccessResponse(201, 'Checkout session created', CheckoutResultDto)
  @ApiValidationError()
  @ApiCommonErrors()
  async createCheckout(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(checkoutSessionSchema))
    body: CheckoutSessionDto,
  ) {
    const result = await this.paymentsService.createCheckoutSession(
      userId,
      body,
    );
    return { data: result };
  }
}
