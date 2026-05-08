import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlansService } from './plans.service.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import { ApiCommonErrors } from '../../common/swagger/global-errors.js';
import { PlansListDto, plansListSchema } from './plans.responses.js';

@ApiTags('Plans')
@ApiCommonErrors()
@Controller('api/v1/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List active plans' })
  @ApiSuccessResponse(200, 'Active plans', PlansListDto)
  async list() {
    const rows = await this.plansService.listActive();
    return {
      data: plansListSchema.parse({ plans: rows }),
    };
  }
}
