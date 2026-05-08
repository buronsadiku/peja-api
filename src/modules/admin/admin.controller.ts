import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { eq, desc, lt, type SQL } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { events, orders, webhooksLog } from '../../database/schema/index.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import {
  markShippedSchema,
  MarkShippedDto,
  paginationSchema,
  PaginationDto,
} from './admin.schemas.js';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
} from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
} from '../../common/swagger/global-errors.js';
import { AdminOrderWrapperDto, WebhookLogDto } from './admin.responses.js';
import { EventDto } from '../events/events.responses.js';
import { OrderDto } from '../orders/orders.responses.js';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('api/v1/admin')
@UseGuards(AdminGuard)
@ApiCommonErrors()
export class AdminController {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  @Get('events')
  @ApiOperation({ summary: 'List all events (admin)' })
  @ApiPaginatedResponse('Paginated list of all events', EventDto)
  async listEvents(
    @Query(new ZodValidationPipe(paginationSchema))
    query: PaginationDto,
  ) {
    const conditions: SQL[] = [];
    if (query.cursor)
      conditions.push(lt(events.createdAt, new Date(query.cursor)));

    const rows = await this.db
      .select()
      .from(events)
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(events.createdAt))
      .limit(query.limit + 1);

    const hasMore = rows.length > query.limit;
    const data = hasMore ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasMore
      ? data[data.length - 1].createdAt.toISOString()
      : null;

    return { data, nextCursor };
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders (admin)' })
  @ApiPaginatedResponse('Paginated list of all orders', OrderDto)
  async listOrders(
    @Query(new ZodValidationPipe(paginationSchema))
    query: PaginationDto,
  ) {
    const conditions: SQL[] = [];
    if (query.cursor)
      conditions.push(lt(orders.createdAt, new Date(query.cursor)));

    const rows = await this.db
      .select()
      .from(orders)
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(query.limit + 1);

    const hasMore = rows.length > query.limit;
    const data = hasMore ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasMore
      ? data[data.length - 1].createdAt.toISOString()
      : null;

    return { data, nextCursor };
  }

  @Post('orders/:orderId/mark-shipped')
  @ApiOperation({ summary: 'Mark order as shipped (admin)' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiSuccessResponse(200, 'Order marked as shipped', AdminOrderWrapperDto)
  @ApiNotFoundError()
  async markShipped(
    @Param('orderId') orderId: string,
    @Body(new ZodValidationPipe(markShippedSchema)) body: MarkShippedDto,
  ) {
    const [order] = await this.db
      .update(orders)
      .set({
        status: 'shipped',
        trackingCarrier: body.carrier,
        trackingNumber: body.trackingNumber,
        trackingUrl: body.trackingUrl || null,
      })
      .where(eq(orders.id, orderId))
      .returning();

    return { data: { order } };
  }

  @Get('webhooks-log')
  @ApiOperation({ summary: 'List recent webhooks (admin)' })
  @ApiPaginatedResponse('Paginated list of webhook events', WebhookLogDto)
  async listWebhooks(
    @Query(new ZodValidationPipe(paginationSchema))
    query: PaginationDto,
  ) {
    const conditions: SQL[] = [];
    if (query.cursor)
      conditions.push(lt(webhooksLog.receivedAt, new Date(query.cursor)));

    const rows = await this.db
      .select()
      .from(webhooksLog)
      .where(conditions.length ? conditions[0] : undefined)
      .orderBy(desc(webhooksLog.receivedAt))
      .limit(query.limit + 1);

    const hasMore = rows.length > query.limit;
    const data = hasMore ? rows.slice(0, query.limit) : rows;
    const nextCursor = hasMore
      ? data[data.length - 1].receivedAt.toISOString()
      : null;

    return { data, nextCursor };
  }
}
