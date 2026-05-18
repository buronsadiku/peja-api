import { Controller, Get, Param, Query } from '@nestjs/common';
import { CommunitiesService } from './communities.service.js';

@Controller('v1/communities')
export class CommunitiesController {
  constructor(private readonly communities: CommunitiesService) {}

  @Get()
  async list(@Query('locale') locale?: string) {
    return { data: await this.communities.list(locale) };
  }

  @Get(':slug')
  async detail(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ) {
    return { data: await this.communities.getBySlug(slug, locale) };
  }
}
