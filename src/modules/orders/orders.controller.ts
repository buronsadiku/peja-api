import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  listOrdersQuerySchema,
  RefundDto,
  refundSchema,
} from './orders.schemas.js';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
} from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
} from '../../common/swagger/global-errors.js';
import {
  OrderDto,
  OrderDetailDto,
  OrderWrapperDto,
} from './orders.responses.js';

@ApiTags('Orders')
@ApiBearerAuth()
@ApiCommonErrors()
@Controller('api/v1/payments/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "List current user's orders" })
  @ApiPaginatedResponse('Paginated list of orders', OrderDto)
  async list(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(listOrdersQuerySchema))
    query: {
      eventId?: string;
      orderType?: 'plan' | 'keepsake';
      cursor?: string;
      limit: number;
    },
  ) {
    const result = await this.ordersService.list(userId, query);
    return { data: result.data, nextCursor: result.nextCursor };
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order detail with items and tracking' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiSuccessResponse(200, 'Order details', OrderDetailDto)
  @ApiNotFoundError()
  async detail(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    const result = await this.ordersService.getDetail(orderId, userId);
    return { data: result };
  }

  @Post(':orderId/refund')
  @ApiOperation({ summary: 'Request order refund' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiSuccessResponse(200, 'Refund initiated', OrderWrapperDto)
  @ApiNotFoundError()
  async refund(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(refundSchema)) body: RefundDto,
  ) {
    const order = await this.ordersService.refund(
      orderId,
      userId,
      body.amountCents ?? undefined,
      body.reason,
    );
    return { data: { order } };
  }
}
