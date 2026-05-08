import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/swagger/api-data-response.js';
import { HealthDto, ReadyDto } from './health.responses.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { CacheService } from '../cache/cache.service.js';
import { sql } from 'drizzle-orm';

type HealthCheck = {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
};

@ApiTags('Health')
@Controller()
export class HealthController {
  private readonly logger = new Logger('HealthController');

  constructor(
    @InjectDrizzle() private readonly db: DrizzleDB,
    private readonly cache: CacheService,
  ) {}

  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness check' })
  @ApiSuccessResponse(200, 'Service is alive', HealthDto)
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check with dependency status' })
  @ApiSuccessResponse(200, 'Service readiness with dependency checks', ReadyDto)
  async ready() {
    const checks: Record<string, HealthCheck> = {};
    let allOk = true;

    const dbStart = Date.now();
    try {
      await this.db.execute(sql`SELECT 1`);
      checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err) {
      checks.database = {
        status: 'error',
        latencyMs: Date.now() - dbStart,
        error: (err as Error).message,
      };
      allOk = false;
    }

    const redisStart = Date.now();
    try {
      const ok = await this.cache.ping();
      checks.queue = {
        status: ok ? 'ok' : 'error',
        latencyMs: Date.now() - redisStart,
      };
      if (!ok) allOk = false;
    } catch (err) {
      checks.queue = {
        status: 'error',
        latencyMs: Date.now() - redisStart,
        error: (err as Error).message,
      };
      allOk = false;
    }

    const status = allOk ? 'ok' : 'degraded';
    return { status, checks };
  }
}
