import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import {
  createRegistrationBatchSchema,
  createRegistrationSchema,
  type CreateRegistrationBatchDto,
  type CreateRegistrationDto,
} from './registrations.dto.js';
import { RegistrationsService } from './registrations.service.js';

@Controller('v1/registrations')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(createRegistrationSchema))
  async create(@Body() body: CreateRegistrationDto) {
    return { data: await this.registrations.create(body) };
  }

  @Post('batch')
  @UsePipes(new ZodValidationPipe(createRegistrationBatchSchema))
  async createBatch(@Body() body: CreateRegistrationBatchDto) {
    return { data: await this.registrations.createBatch(body) };
  }

  @Get('lookup')
  async lookup(@Query('email') email?: string) {
    if (!email) {
      throw new BadRequestException('email query param is required');
    }
    const row = await this.registrations.lookupByEmail(email);
    return { data: row };
  }
}
