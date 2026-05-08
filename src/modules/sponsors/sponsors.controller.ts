import { Controller, Get } from '@nestjs/common';
import { SponsorsService } from './sponsors.service.js';

@Controller('v1/sponsors')
export class SponsorsController {
  constructor(private readonly sponsors: SponsorsService) {}

  @Get()
  async list() {
    return { data: await this.sponsors.list() };
  }
}
