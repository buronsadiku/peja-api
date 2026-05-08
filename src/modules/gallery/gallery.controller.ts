import { Controller, Get, Query } from '@nestjs/common';
import { GalleryService, type GallerySection } from './gallery.service.js';

@Controller('v1/gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  async list(@Query('section') section?: GallerySection) {
    return { data: await this.gallery.list(section) };
  }
}
