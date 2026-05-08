import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { jobsLog } from '../../database/schema/index.js';
import { NotFoundError } from '../../common/errors/errors.js';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
} from '../../common/swagger/global-errors.js';
import { JobWrapperDto } from './jobs.responses.js';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('api/v1/jobs')
@ApiCommonErrors()
export class JobsController {
  constructor(@InjectDrizzle() private readonly db: DrizzleDB) {}

  @Get(':jobId')
  @ApiOperation({ summary: 'Get background job status' })
  @ApiParam({ name: 'jobId', description: 'Job UUID' })
  @ApiSuccessResponse(200, 'Job status', JobWrapperDto)
  @ApiNotFoundError()
  async getJob(@Param('jobId') jobId: string) {
    const rows = await this.db
      .select()
      .from(jobsLog)
      .where(eq(jobsLog.id, jobId))
      .limit(1);
    if (!rows[0]) throw new NotFoundError('Job', jobId);

    const job = rows[0];
    return {
      data: {
        job: {
          id: job.id,
          status: job.status,
          progress: null,
          result: job.result,
          error: job.lastError,
        },
      },
    };
  }
}
