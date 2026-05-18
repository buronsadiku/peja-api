import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UploadsService, type UploadFolder } from './uploads.service.js';

@Controller('v1/internal/uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('image')
  @HttpCode(200)
  async uploadImage(
    @Req() req: Request,
    @Query('folder') folder: string,
    @Query('filename') filename: string | undefined,
    @Headers('x-internal-token') token: string,
    @Headers('content-type') contentType: string,
  ) {
    const expected = process.env.INTERNAL_UPLOAD_TOKEN;
    if (!expected) {
      throw new ForbiddenException({
        code: 'internal_uploads_disabled',
        message: 'INTERNAL_UPLOAD_TOKEN not configured',
      });
    }
    if (token !== expected) {
      throw new ForbiddenException({
        code: 'invalid_internal_token',
        message: 'invalid internal token',
      });
    }
    if (
      folder !== 'gallery' &&
      folder !== 'activities' &&
      folder !== 'communities' &&
      folder !== 'musicians'
    ) {
      throw new BadRequestException({
        code: 'invalid_folder',
        message:
          'folder must be "gallery", "activities", "communities" or "musicians"',
      });
    }
    if (!contentType || !contentType.startsWith('image/')) {
      throw new BadRequestException({
        code: 'invalid_mime',
        message: 'content-type must be image/*',
      });
    }

    const body = req.body as Buffer | undefined;
    if (!body || !Buffer.isBuffer(body) || body.length === 0) {
      throw new BadRequestException({
        code: 'empty_body',
        message: 'request body required',
      });
    }

    const safeFilename = (filename ?? 'image')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .slice(-80);

    const result = await this.uploads.uploadImage(
      folder as UploadFolder,
      body,
      safeFilename,
    );
    return { data: result };
  }
}
