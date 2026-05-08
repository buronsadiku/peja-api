import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import type { Request } from 'express';
import { PublicService } from './public.service.js';
import {
  uploadUrlSchema,
  createMessageSchema,
  invitationOpenSchema,
  UploadUrlDto,
  CreateMessageDto,
} from './public.schemas.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiNotFoundError,
  ApiValidationError,
} from '../../common/swagger/global-errors.js';
import {
  PublicEventDto,
  UploadUrlsResultDto,
  CreateMessageResultDto,
  PublicGalleryDto,
} from './public.responses.js';
import { z } from 'zod';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { PublicSubmission } from '../../common/decorators/public-submission.decorator.js';
import {
  RateLimitedError,
  ValidationError,
} from '../../common/errors/errors.js';
import { RateLimitService } from '../../common/services/rate-limit.service.js';
import { getEnv } from '../../config/env.js';
import { peppered, sourceIp } from '../../common/utils/identity-hash.js';

@ApiTags('Public')
@Public()
@Controller('api/v1/public/events')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get(':slug')
  @ApiOperation({ summary: 'Get public event info for guest landing' })
  @ApiParam({ name: 'slug', description: 'Event slug' })
  @ApiSuccessResponse(200, 'Public event info', PublicEventDto)
  @ApiNotFoundError()
  async getEvent(@Param('slug') slug: string) {
    const event = await this.publicService.getPublicEvent(slug);
    return { data: event };
  }

  @Post(':slug/upload-url')
  @PublicSubmission()
  @ApiOperation({ summary: 'Request presigned upload URLs' })
  @ApiParam({ name: 'slug', description: 'Event slug' })
  @ApiSuccessResponse(200, 'Presigned upload URLs', UploadUrlsResultDto)
  async uploadUrl(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(uploadUrlSchema)) body: UploadUrlDto,
  ) {
    if (body.source !== 'kiosk') {
      await this.checkIpRateLimit(
        req,
        'upload-url',
        getEnv().RATE_LIMIT_UPLOAD_URL_PER_IP,
      );
    }
    const result = await this.publicService.generateUploadUrls(slug, body);
    return { data: result };
  }

  @Post(':slug/messages')
  @PublicSubmission()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a guest message' })
  @ApiParam({ name: 'slug', description: 'Event slug' })
  @ApiSuccessResponse(201, 'Message created', CreateMessageResultDto)
  @ApiValidationError()
  async createMessage(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body(new ZodValidationPipe(createMessageSchema)) body: CreateMessageDto,
  ) {
    const env = getEnv();
    const isKioskSource =
      typeof body.submissionSource === 'string' &&
      body.submissionSource === 'kiosk';

    if (!isKioskSource) {
      await this.checkIpRateLimit(
        req,
        'messages',
        env.RATE_LIMIT_MESSAGES_PER_IP,
      );

      const slugHit = await this.rateLimit.hit(
        `messages:slug:${slug}`,
        env.RATE_LIMIT_MESSAGES_PER_SLUG,
        env.RATE_LIMIT_PER_SLUG_WINDOW_MS,
      );
      if (!slugHit.allowed) throw new RateLimitedError(slugHit.retryAfterSec);
    }

    if (!idempotencyKey) {
      throw new ValidationError({
        'Idempotency-Key': 'Idempotency-Key header is required',
      });
    }
    const result = await this.publicService.createMessage(
      slug,
      idempotencyKey,
      body,
    );
    return { data: result };
  }

  @Get(':slug/gallery')
  @ApiOperation({ summary: 'Public gallery feed for an event' })
  @ApiParam({ name: 'slug', description: 'Event slug' })
  @ApiSuccessResponse(200, 'Gallery feed', PublicGalleryDto)
  async gallery(
    @Param('slug') slug: string,
    @Query(
      new ZodValidationPipe(
        z.object({
          type: z.enum(['photo', 'video', 'all']).default('all'),
          sort: z.enum(['newest', 'oldest']).default('newest'),
          cursor: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(24),
        }),
      ),
    )
    query: {
      type: 'photo' | 'video' | 'all';
      sort: 'newest' | 'oldest';
      cursor?: string;
      limit: number;
    },
  ) {
    const type = query.type === 'all' ? undefined : query.type;
    const result = await this.publicService.getPublicGallery(slug, {
      type,
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
    });
    return result;
  }

  @Post(':slug/invitations/open')
  @PublicSubmission()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record invitation open' })
  @ApiParam({ name: 'slug', description: 'Event slug' })
  @ApiResponse({ status: 204, description: 'Open recorded' })
  async invitationOpen(
    @Req() req: Request,
    @Param('slug') _slug: string,
    @Body(new ZodValidationPipe(invitationOpenSchema)) _body: any,
  ) {
    await this.checkIpRateLimit(
      req,
      'invitations',
      getEnv().RATE_LIMIT_INVITATIONS_PER_IP,
    );
  }

  private async checkIpRateLimit(
    req: Request,
    bucket: string,
    limit: number,
  ): Promise<void> {
    const ipHash = peppered(sourceIp(req)) ?? 'unknown';
    const result = await this.rateLimit.hit(
      `${bucket}:ip:${ipHash}`,
      limit,
      getEnv().RATE_LIMIT_WINDOW_MS,
    );
    if (!result.allowed) throw new RateLimitedError(result.retryAfterSec);
  }
}
