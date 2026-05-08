import { Controller, Get, Query } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';

@Controller('v1/activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  async list(@Query('date') date?: string) {
    return { data: await this.activities.listOccurrences(date) };
  }

  @Get('dates')
  async dates() {
    return { data: await this.activities.listFestivalDates() };
  }
}
