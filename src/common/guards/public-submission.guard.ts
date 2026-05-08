import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PUBLIC_SUBMISSION_KEY } from '../decorators/public-submission.decorator.js';
import {
  InvalidOriginError,
  InvalidSubmissionError,
} from '../errors/errors.js';
import { getEnv } from '../../config/env.js';
import { requestIdentity } from '../utils/identity-hash.js';

@Injectable()
export class PublicSubmissionGuard implements CanActivate {
  private readonly logger = new Logger('PublicSubmissionGuard');

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublicSubmission = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_SUBMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!isPublicSubmission) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const env = getEnv();
    const allowed = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());

    const origin = req.headers.origin ?? null;
    const referer = req.headers.referer ?? null;
    const candidate = origin ?? this.extractOrigin(referer);

    if (!candidate || !allowed.includes(candidate)) {
      const { ipHash, uaHash } = requestIdentity(req);
      this.logger.warn(
        { reason: 'origin', origin, referer, path: req.url, ipHash, uaHash },
        'spam_rejected',
      );
      throw new InvalidOriginError();
    }

    const body = (req.body ?? {}) as Record<string, unknown>;

    if (typeof body._honeypot === 'string' && body._honeypot.trim() !== '') {
      const { ipHash, uaHash } = requestIdentity(req);
      this.logger.warn(
        { reason: 'honeypot', path: req.url, ipHash, uaHash },
        'spam_rejected',
      );
      throw new InvalidSubmissionError('honeypot');
    }

    const dwellTs = Number(body._t);
    if (Number.isFinite(dwellTs)) {
      const elapsed = Date.now() - dwellTs;
      if (elapsed < env.DWELL_TIME_MIN_MS || elapsed > env.DWELL_TIME_MAX_MS) {
        const { ipHash, uaHash } = requestIdentity(req);
        this.logger.warn(
          { reason: 'dwell', elapsed, path: req.url, ipHash, uaHash },
          'spam_rejected',
        );
        throw new InvalidSubmissionError('dwell');
      }
    }

    return true;
  }

  private extractOrigin(url: string | null): string | null {
    if (!url) return null;
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.host}`;
    } catch {
      return null;
    }
  }
}
