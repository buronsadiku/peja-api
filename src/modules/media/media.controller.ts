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
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { MediaUploadService } from './media-upload.service.js';
import { MediaQueryService } from './media-query.service.js';
import { MediaCurationService } from './media-curation.service.js';
import {
  mediaUploadUrlsSchema,
  mediaFinalizeSchema,
  galleryQuerySchema,
  updateMediaSchema,
  MediaUploadUrlsDto,
  MediaFinalizeDto,
  GalleryQueryDto,
  UpdateMediaDto,
} from './media.schemas.js';
import { MediaUploadUrlsResultDto, GalleryFeedDto } from './media.responses.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EventOwnerGuard } from '../../common/guards/event-owner.guard.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
  ApiValidationError,
} from '../../common/swagger/global-errors.js';

@ApiTags('Media')
@ApiBearerAuth()
@ApiCommonErrors()
@Controller('api/v1/events/:eventId/media')
@UseGuards(EventOwnerGuard)
export class MediaController {
  constructor(
    private readonly uploadService: MediaUploadService,
    private readonly queryService: MediaQueryService,
    private readonly curationService: MediaCurationService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List event gallery (photos and videos)' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Gallery feed', GalleryFeedDto)
  async listGallery(
    @Param('eventId') eventId: string,
    @Query(new ZodValidationPipe(galleryQuerySchema)) query: GalleryQueryDto,
  ) {
    const type = query.type === 'all' ? undefined : query.type;
    const filter = query.filter === 'all' ? undefined : query.filter;
    const result = await this.queryService.getGallery(eventId, {
      type,
      filter,
      sort: query.sort,
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });
    return result;
  }

  @Post('upload-urls')
  @ApiOperation({ summary: 'Owner: presigned upload URLs for photos/videos' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Presigned URLs', MediaUploadUrlsResultDto)
  @ApiValidationError()
  async uploadUrls(
    @Param('eventId') eventId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(mediaUploadUrlsSchema))
    body: MediaUploadUrlsDto,
  ) {
    const result = await this.uploadService.generateUploadUrls({
      eventId,
      items: body.items,
      uploader: { kind: 'owner', userId },
    });
    return { data: result };
  }

  @Post('finalize')
  @ApiOperation({
    summary: 'Owner: finalize uploaded media (verify + dispatch)',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiResponse({ status: 200, description: 'Finalized' })
  @ApiValidationError()
  async finalize(
    @Param('eventId') eventId: string,
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(mediaFinalizeSchema)) body: MediaFinalizeDto,
  ) {
    const result = await this.uploadService.finalizeOwnerUploads(
      eventId,
      userId,
      body.items,
    );
    return { data: result };
  }

  @Patch(':mediaId')
  @ApiOperation({ summary: 'Update media flags (favorite, gold book)' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'mediaId', description: 'Media UUID' })
  @ApiNotFoundError()
  @ApiValidationError()
  async update(
    @Param('eventId') eventId: string,
    @Param('mediaId') mediaId: string,
    @Body(new ZodValidationPipe(updateMediaSchema)) body: UpdateMediaDto,
  ) {
    const row = await this.curationService.updateFlags(eventId, mediaId, body);
    return {
      data: {
        media: {
          id: row.id,
          isFavorite: row.isFavorite,
          isGoldBookSelected: row.isGoldBookSelected,
        },
      },
    };
  }

  @Delete(':mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete media item' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiParam({ name: 'mediaId', description: 'Media UUID' })
  @ApiNotFoundError()
  async remove(
    @Param('eventId') eventId: string,
    @Param('mediaId') mediaId: string,
  ) {
    await this.curationService.softDelete(eventId, mediaId);
  }
}
