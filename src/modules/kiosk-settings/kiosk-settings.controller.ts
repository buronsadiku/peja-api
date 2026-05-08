import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { KioskSettingsService } from './kiosk-settings.service.js';
import {
  UpdateKioskSettingsDto,
  updateKioskSettingsSchema,
} from './kiosk-settings.schemas.js';
import { KioskSettingsWrapperDto } from './kiosk-settings.responses.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { EventOwnerGuard } from '../../common/guards/event-owner.guard.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
  ApiValidationError,
} from '../../common/swagger/global-errors.js';

@ApiTags('Kiosk Settings')
@ApiBearerAuth()
@ApiCommonErrors()
@Controller('api/v1/events/:eventId/kiosk-settings')
export class KioskSettingsController {
  constructor(private readonly service: KioskSettingsService) {}

  @Get()
  @UseGuards(EventOwnerGuard)
  @ApiOperation({ summary: 'Get or create kiosk settings for an event' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Kiosk settings', KioskSettingsWrapperDto)
  @ApiNotFoundError()
  async get(@Param('eventId') eventId: string) {
    const settings = await this.service.getOrCreateForEvent(eventId);
    return { data: { settings } };
  }

  @Patch()
  @UseGuards(EventOwnerGuard)
  @ApiOperation({ summary: 'Update kiosk settings' })
  @ApiParam({ name: 'eventId', description: 'Event UUID' })
  @ApiSuccessResponse(200, 'Kiosk settings updated', KioskSettingsWrapperDto)
  @ApiNotFoundError()
  @ApiValidationError()
  async update(
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(updateKioskSettingsSchema))
    body: UpdateKioskSettingsDto,
  ) {
    const settings = await this.service.update(eventId, body);
    return { data: { settings } };
  }
}
