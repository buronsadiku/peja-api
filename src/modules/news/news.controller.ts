import { Controller, Get, Param, Query } from '@nestjs/common';
import { NewsService } from './news.service.js';

@Controller('v1/news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get()
  async list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.news.list({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    return { data: await this.news.getBySlug(slug) };
  }
}
