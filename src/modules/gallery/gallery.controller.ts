import { Controller, Get, Query } from '@nestjs/common';
import { GalleryService, type GallerySection } from './gallery.service.js';

@Controller('v1/gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  async list(
    @Query('section') section?: GallerySection,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.gallery.list({
      section,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
