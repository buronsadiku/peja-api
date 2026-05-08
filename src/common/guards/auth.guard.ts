import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ForbiddenError, UnauthorizedError } from '../errors/errors.js';
import { getEnv } from '../../config/env.js';
import { InjectDrizzle } from '../../database/database.decorator.js';
import type { DrizzleDB } from '../../database/database.types.js';
import { session, users } from '../../database/schema/index.js';
import { requestIdentity } from '../utils/identity-hash.js';
import { SessionRefreshService } from '../../modules/auth/session-refresh.service.js';
import { AuditLogService } from '../../modules/auth/audit-log.service.js';
import type { PejaRequest } from '../types/request.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const REFRESH_DEBOUNCE_MS = 60_000;
const RISK_THRESHOLD = 30;

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger('AuthGuard');

  constructor(
    private reflector: Reflector,
    @InjectDrizzle() private db: DrizzleDB,
    private refreshQueue: SessionRefreshService,
    private audit: AuditLogService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<PejaRequest>();
    const env = getEnv();

    const cookieValue = this.extractCookie(req, env.AUTH_COOKIE_NAME);
    if (!cookieValue) {
      throw new UnauthorizedError(
        'Missing session cookie',
        'errors:missing_auth_header',
      );
    }

    const sessionToken = this.verifyAndExtractSessionToken(
      cookieValue,
      env.AUTH_COOKIE_SECRET,
    );

    const [row] = await this.db
      .select({
        sessionId: session.id,
        sessionLastUsedAt: session.lastUsedAt,
        sessionLastIpHash: session.lastIpHash,
        sessionLastUaHash: session.lastUaHash,
        sessionRiskScore: session.riskScore,
        sessionCsrfToken: session.csrfToken,
        sessionFreshAuthAt: session.freshAuthAt,
        user: users,
      })
      .from(session)
      .innerJoin(users, eq(users.id, session.userId))
      .where(
        and(eq(session.token, sessionToken), gt(session.expiresAt, new Date())),
      )
      .limit(1);

    if (!row || row.user.deletedAt) {
      throw new UnauthorizedError('Session not found', 'errors:user_not_found');
    }

    // CSRF: state-changing methods require X-CSRF-Token matching session row.
    if (!SAFE_METHODS.has(req.method)) {
      this.verifyCsrf(req, row.sessionCsrfToken, row.user.id);
    }

    // IP/UA fingerprint: bump risk on mismatch, but never hard-block here.
    const { ipHash, uaHash } = requestIdentity(req);
    let riskBump = 0;
    if (row.sessionLastIpHash && ipHash && row.sessionLastIpHash !== ipHash) {
      riskBump += 10;
    }
    if (row.sessionLastUaHash && uaHash && row.sessionLastUaHash !== uaHash) {
      riskBump += 5;
    }

    const newRiskScore = Math.min(row.sessionRiskScore + riskBump, 100);
    if (riskBump > 0 && newRiskScore >= RISK_THRESHOLD) {
      void this.audit.record({
        userId: row.user.id,
        event: 'risk_elevated',
        ipHash,
        uaHash,
        metadata: {
          previous: row.sessionRiskScore,
          current: newRiskScore,
          bump: riskBump,
        },
      });
    }

    // Sliding refresh + risk update via batched queue (debounced 60s).
    const stale =
      Date.now() - row.sessionLastUsedAt.getTime() > REFRESH_DEBOUNCE_MS;
    if (stale || riskBump > 0) {
      this.refreshQueue.enqueue(row.sessionId, {
        ipHash,
        uaHash,
        riskBump,
      });
    }

    req.currentUser = row.user;
    req.sessionId = row.sessionId;
    req.sessionRisk = newRiskScore;
    req.sessionFreshAuthAt = row.sessionFreshAuthAt;
    return true;
  }

  private extractCookie(req: PejaRequest, name: string): string | undefined {
    const cookies = (req as unknown as { cookies?: Record<string, string> })
      .cookies;
    if (cookies?.[name]) return cookies[name];

    const raw = req.headers.cookie;
    if (!raw) return undefined;
    for (const pair of raw.split(';')) {
      const idx = pair.indexOf('=');
      if (idx === -1) continue;
      const key = pair.slice(0, idx).trim();
      if (key === name) {
        return decodeURIComponent(pair.slice(idx + 1).trim());
      }
    }
    return undefined;
  }

  private verifyAndExtractSessionToken(
    cookieValue: string,
    secret: string,
  ): string {
    const idx = cookieValue.lastIndexOf('.');
    if (idx === -1) {
      throw new UnauthorizedError(
        'Malformed session cookie',
        'errors:invalid_token',
      );
    }
    const token = cookieValue.slice(0, idx);
    const sig = cookieValue.slice(idx + 1);

    const expected = createHmac('sha256', secret)
      .update(token)
      .digest('base64');
    const sigBuf = Buffer.from(sig, 'base64');
    const expBuf = Buffer.from(expected, 'base64');

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedError(
        'Invalid session signature',
        'errors:invalid_token',
      );
    }
    return token;
  }

  private verifyCsrf(
    req: PejaRequest,
    expectedToken: string,
    userId: string,
  ): void {
    const provided =
      (req.headers['x-csrf-token'] as string | undefined) ??
      (req.headers['x-xsrf-token'] as string | undefined);

    if (!provided) {
      void this.audit.record({
        userId,
        event: 'csrf_failure',
        metadata: { reason: 'missing_header', method: req.method },
      });
      throw new ForbiddenError('Missing CSRF token', 'errors:csrf_required');
    }

    const a = Buffer.from(provided);
    const b = Buffer.from(expectedToken);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      void this.audit.record({
        userId,
        event: 'csrf_failure',
        metadata: { reason: 'mismatch', method: req.method },
      });
      throw new ForbiddenError('Invalid CSRF token', 'errors:csrf_invalid');
    }
  }
}
