import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';

@Controller('v1/activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  async list(@Query('festivalDayId') festivalDayId?: string) {
    return { data: await this.activities.listOccurrences(festivalDayId) };
  }

  @Get('festival-days')
  async festivalDays() {
    return { data: await this.activities.listFestivalDays() };
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    return { data: await this.activities.getBySlug(slug) };
  }
}
