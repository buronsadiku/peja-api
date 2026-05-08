import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PejaRequest } from '../../common/types/request.js';
import { eq } from 'drizzle-orm';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { session } from '../../database/schema/index.js';
import { UnauthorizedError } from '../../common/errors/errors.js';

@ApiTags('auth')
@Controller('api/v1/auth')
export class CsrfController {
  constructor(@InjectDrizzle() private db: DrizzleDB) {}

  /**
   * Returns the CSRF token for the current session. The frontend caches
   * this value and sends it as `X-CSRF-Token` on every state-changing
   * request.
   *
   * Token rotation: the token is set once per session at sign-in. To
   * rotate, call sign-out + sign-in. Refusing to rotate per-request keeps
   * this endpoint cheap and avoids races.
   */
  @Get('csrf')
  @ApiOperation({ summary: 'Read CSRF token for the current session' })
  async csrf(@Req() req: PejaRequest) {
    if (!req.sessionId) {
      throw new UnauthorizedError('No session', 'errors:missing_auth_header');
    }
    const [row] = await this.db
      .select({ csrfToken: session.csrfToken })
      .from(session)
      .where(eq(session.id, req.sessionId))
      .limit(1);
    if (!row) {
      throw new UnauthorizedError('Session not found', 'errors:user_not_found');
    }
    return { data: { csrfToken: row.csrfToken } };
  }
}
