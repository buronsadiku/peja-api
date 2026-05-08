import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
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
import { MessagesService } from './messages.service.js';
import {
  listMessagesQuerySchema,
  updateMessageSchema,
  retranscribeSchema,
  UpdateMessageDto,
  ListMessagesQuery,
} from './messages.schemas.js';
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
  MessageSummaryDto,
  MessageDetailDto,
  MessageWrapperDto,
  RetranscribeResultDto,
} from './messages.responses.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EventOwnerGuard } from '../../common/guards/event-owner.guard.js';

@ApiTags('Messages')
@ApiBearerAuth()
@ApiCommonErrors()
@Controller('api/v1/events/:eventId/messages')
@UseGuards(EventOwnerGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({
    summary: 'List event messages with filtering and pagination',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiPaginatedResponse('Paginated list of messages', MessageSummaryDto)
  async list(
    @Param('eventId') eventId: string,
    @Query(new ZodValidationPipe(listMessagesQuerySchema))
    query: ListMessagesQuery,
  ) {
    const result = await this.messagesService.list(eventId, query);
    return { data: result.data, nextCursor: result.nextCursor };
  }

  @Get(':messageId')
  @ApiOperation({ summary: 'Get message detail with playback URLs' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiSuccessResponse(200, 'Message details', MessageDetailDto)
  @ApiNotFoundError()
  async detail(@Param('messageId') messageId: string) {
    const result = await this.messagesService.getDetail(messageId);
    return { data: result };
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Update message (favorite, notes, trim)' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiSuccessResponse(200, 'Message updated', MessageWrapperDto)
  @ApiNotFoundError()
  @ApiValidationError()
  async update(
    @Param('messageId') messageId: string,
    @Body(new ZodValidationPipe(updateMessageSchema)) body: UpdateMessageDto,
  ) {
    const message = await this.messagesService.update(messageId, body);
    return { data: { message } };
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete message' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({ status: 204, description: 'Message deleted' })
  async remove(@Param('messageId') messageId: string) {
    await this.messagesService.softDelete(messageId);
  }

  @Post(':messageId/retranscribe')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Re-transcribe message audio' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiSuccessResponse(202, 'Retranscription queued', RetranscribeResultDto)
  @ApiNotFoundError()
  async retranscribe(
    @Param('messageId') messageId: string,
    @Body(new ZodValidationPipe(retranscribeSchema))
    body: { language?: string },
  ) {
    const result = await this.messagesService.retranscribe(
      messageId,
      body.language,
    );
    return { data: result };
  }
}
