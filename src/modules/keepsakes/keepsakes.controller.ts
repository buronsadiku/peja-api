import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { KeepsakesService } from './keepsakes.service.js';
import {
  goldBookPreviewSchema,
  videoMontagePreviewSchema,
  GoldBookPreviewDto,
  VideoMontagePreviewDto,
} from './keepsakes.schemas.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiValidationError,
} from '../../common/swagger/global-errors.js';
import {
  CatalogResultDto,
  PreviewResultDto,
  ProductDetailResultDto,
} from './keepsakes.responses.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EventOwnerGuard } from '../../common/guards/event-owner.guard.js';

@ApiTags('Keepsakes')
@ApiBearerAuth()
@ApiCommonErrors()
@Controller('api/v1')
export class KeepsakesController {
  constructor(private readonly keepsakesService: KeepsakesService) {}

  @Get('keepsakes/catalog')
  @ApiOperation({ summary: 'Get keepsake product catalog' })
  @ApiQuery({ name: 'category', required: false })
  @ApiSuccessResponse(200, 'Product catalog', CatalogResultDto)
  async catalog(@Query('category') category?: string) {
    const result = await this.keepsakesService.getCatalog(category);
    return { data: result };
  }

  @Get('keepsakes/products/:slug')
  @ApiOperation({ summary: 'Get keepsake product detail by slug' })
  @ApiParam({ name: 'slug', description: 'Product slug' })
  @ApiSuccessResponse(200, 'Product detail', ProductDetailResultDto)
  async productBySlug(@Param('slug') slug: string) {
    const result = await this.keepsakesService.getProductBySlug(slug);
    return { data: result };
  }

  @Post('events/:eventId/keepsakes/gold-book/preview')
  @UseGuards(EventOwnerGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request Gold Book PDF preview' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(202, 'Preview generation queued', PreviewResultDto)
  @ApiValidationError()
  async goldBookPreview(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(goldBookPreviewSchema))
    body: GoldBookPreviewDto,
  ) {
    const result = await this.keepsakesService.requestGoldBookPreview(
      eventId,
      body,
    );
    return { data: result };
  }

  @Post('events/:eventId/keepsakes/video-montage/preview')
  @UseGuards(EventOwnerGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request video montage preview' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(202, 'Preview generation queued', PreviewResultDto)
  @ApiValidationError()
  async videoMontagePreview(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(videoMontagePreviewSchema))
    body: VideoMontagePreviewDto,
  ) {
    const result = await this.keepsakesService.requestVideoMontagePreview(
      eventId,
      body,
    );
    return { data: result };
  }
}
