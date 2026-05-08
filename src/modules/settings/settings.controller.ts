import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service.js';
import { updateSettingsSchema, UpdateSettingsDto } from './settings.schemas.js';
import { SettingsWrapperDto } from './settings.responses.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EventOwnerGuard } from '../../common/guards/event-owner.guard.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
  ApiValidationError,
} from '../../common/swagger/global-errors.js';

@ApiTags('Event Settings')
@ApiBearerAuth()
@ApiCommonErrors()
@Controller('api/v1/events/:eventId/settings')
@UseGuards(EventOwnerGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get settings for event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Settings', SettingsWrapperDto)
  @ApiNotFoundError()
  async get(@Param('eventId') eventId: string) {
    const settings = await this.service.getOrCreate(eventId);
    return { data: { settings } };
  }

  @Patch()
  @ApiOperation({ summary: 'Update settings for event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Settings updated', SettingsWrapperDto)
  @ApiNotFoundError()
  @ApiValidationError()
  async update(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: UpdateSettingsDto,
  ) {
    const settings = await this.service.update(eventId, body);
    return { data: { settings } };
  }
}
