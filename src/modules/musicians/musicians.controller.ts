import { Controller, Get, Query } from '@nestjs/common';
import { MusiciansService } from './musicians.service.js';

@Controller('v1/musicians')
export class MusiciansController {
  constructor(private readonly musicians: MusiciansService) {}

  @Get()
  async list(
    @Query('festivalDayId') festivalDayId?: string,
    @Query('locale') locale?: string,
  ) {
    return { data: await this.musicians.list(festivalDayId, locale) };
  }
}
