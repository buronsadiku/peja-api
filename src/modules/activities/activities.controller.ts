import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';

@Controller('v1/activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  async list(
    @Query('festivalDayId') festivalDayId?: string,
    @Query('locale') locale?: string,
  ) {
    return {
      data: await this.activities.listOccurrences(festivalDayId, locale),
    };
  }

  @Get('festival-days')
  async festivalDays() {
    return { data: await this.activities.listFestivalDays() };
  }

  @Get('categories')
  async categories(@Query('locale') locale?: string) {
    return { data: await this.activities.listCategories(locale) };
  }

  @Get(':slug')
  async detail(
    @Param('slug') slug: string,
    @Query('locale') locale?: string,
  ) {
    return { data: await this.activities.getBySlug(slug, locale) };
  }
}
