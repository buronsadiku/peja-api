import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { WebhooksService } from './webhooks.service.js';
import type { PejaRequest } from '../../common/types/request.js';

@ApiTags('Webhooks')
@Public()
@Controller('api/v1/webhooks')
export class WebhooksController {
  private readonly logger = new Logger('WebhooksController');

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('payment/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle payment provider webhook' })
  @ApiParam({
    name: 'provider',
    description: 'Payment provider name (e.g. stripe)',
  })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  async handlePaymentWebhook(
    @Param('provider') provider: string,
    @Req() req: PejaRequest,
    @Headers('stripe-signature') stripeSignature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.warn('No raw body available for webhook');
      return { received: true };
    }

    await this.webhooksService.processWebhook(
      provider,
      rawBody,
      stripeSignature || '',
    );
    return { received: true };
  }
}
