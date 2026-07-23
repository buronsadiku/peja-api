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

  @Get('years')
  async years() {
    const data = await this.gallery.listYears();
    return { data };
  }

  @Get()
  async list(
    @Query('section') section?: GallerySection,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('showOnLanding') showOnLanding?: string,
  ) {
    const parsedYear = year ? parseInt(year, 10) : undefined;
    return this.gallery.list({
      section,
      year: Number.isFinite(parsedYear) ? parsedYear : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      showOnLanding: parseBool(showOnLanding),
    });
  }
}
