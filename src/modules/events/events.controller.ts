import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
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
import { EventsService } from './events.service.js';
import { StorageService } from '../storage/storage.service.js';
import {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
  coverUploadUrlSchema,
  CreateEventDto,
  UpdateEventDto,
  CoverUploadUrlDto,
} from './events.schemas.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EventOwnerGuard } from '../../common/guards/event-owner.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CurrentEvent } from '../../common/decorators/current-event.decorator.js';
import {
  ApiSuccessResponse,
  ApiPaginatedResponse,
} from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
  ApiValidationError,
} from '../../common/swagger/global-errors.js';
import {
  EventDto,
  EventWrapperDto,
  QrCodeResultDto,
  EventStatsDto,
  CoverUploadResultDto,
} from './events.responses.js';

@ApiTags('Events')
@ApiBearerAuth()
@ApiCommonErrors()
@Controller('api/v1/events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new wedding event' })
  @ApiSuccessResponse(201, 'Event created', EventWrapperDto)
  @ApiValidationError()
  async create(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(createEventSchema)) body: CreateEventDto,
  ) {
    const event = await this.eventsService.create(userId, body);
    return { data: { event } };
  }

  @Get()
  @ApiOperation({ summary: "List current user's events" })
  @ApiPaginatedResponse('Paginated list of events', EventDto)
  async list(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(listEventsQuerySchema))
    query: { status?: string; cursor?: string; limit: number },
  ) {
    const result = await this.eventsService.list(userId, query);
    return { data: result.data, nextCursor: result.nextCursor };
  }

  @Get(':eventId')
  @UseGuards(EventOwnerGuard)
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Event details', EventWrapperDto)
  @ApiNotFoundError()
  findOne(@CurrentEvent() event: Record<string, unknown>) {
    return { data: { event } };
  }

  @Patch(':eventId')
  @UseGuards(EventOwnerGuard)
  @ApiOperation({ summary: 'Update event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Event updated', EventWrapperDto)
  @ApiNotFoundError()
  @ApiValidationError()
  async update(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(updateEventSchema)) body: UpdateEventDto,
  ) {
    const event = await this.eventsService.update(eventId, body);
    return { data: { event } };
  }

  @Delete(':eventId')
  @UseGuards(EventOwnerGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({ status: 204, description: 'Event deleted' })
  async remove(@Param('eventId') eventId: string) {
    await this.eventsService.softDelete(eventId);
  }

  @Post(':eventId/archive')
  @UseGuards(EventOwnerGuard)
  @ApiOperation({ summary: 'Archive event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Event archived', EventWrapperDto)
  async archive(@Param('eventId') eventId: string) {
    const event = await this.eventsService.archive(eventId);
    return { data: { event } };
  }

  @Get(':eventId/qr')
  @UseGuards(EventOwnerGuard)
  @ApiOperation({ summary: 'Generate QR code for event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'QR code data', QrCodeResultDto)
  @ApiNotFoundError()
  async qrCode(
    @Param('eventId') eventId: string,
    @Query('format') format: 'png' | 'svg' = 'png',
    @Query('size') size: string = '512',
  ) {
    const result = await this.eventsService.generateQrCode(
      eventId,
      format === 'svg' ? 'svg' : 'png',
      parseInt(size) || 512,
    );
    const qrData =
      result.format === 'svg'
        ? result.qrData
        : `data:image/png;base64,${result.qrData.toString('base64')}`;
    return {
      data: { qrData, shortUrl: result.shortUrl, format: result.format },
    };
  }

  @Get(':eventId/stats')
  @UseGuards(EventOwnerGuard)
  @ApiOperation({ summary: 'Get event dashboard stats' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Event statistics', EventStatsDto)
  @ApiNotFoundError()
  async stats(@Param('eventId') eventId: string) {
    const stats = await this.eventsService.getStats(eventId);
    return { data: stats };
  }

  @Post(':eventId/cover-upload-url')
  @UseGuards(EventOwnerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate presigned upload URL for cover photo' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Cover upload URL', CoverUploadResultDto)
  @ApiValidationError()
  @ApiNotFoundError()
  async coverUploadUrl(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(coverUploadUrlSchema)) body: CoverUploadUrlDto,
  ) {
    const result = await this.storageService.presignCoverUpload(
      eventId,
      body.contentType,
    );
    return {
      data: {
        uploadUrl: result.uploadUrl,
        publicUrl: result.publicUrl,
        key: result.key,
        maxSizeBytes: result.maxSizeBytes,
      },
    };
  }
}
