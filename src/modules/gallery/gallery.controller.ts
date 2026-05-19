import { Controller, Get, Query } from '@nestjs/common';
import { GalleryService, type GallerySection } from './gallery.service.js';

const parseBool = (v?: string): boolean | undefined => {
  if (v === undefined) return undefined;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return undefined;
};

@Controller('v1/gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get('categories')
  async categories(@Query('locale') locale?: string) {
    const data = await this.gallery.listCategories(locale);
    return { data };
  }

  @Get()
  async list(
    @Query('section') section?: GallerySection,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('showOnLanding') showOnLanding?: string,
  ) {
    return this.gallery.list({
      section,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      showOnLanding: parseBool(showOnLanding),
    });
  }
}
