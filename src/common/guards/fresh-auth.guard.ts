import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ForbiddenError } from '../errors/errors.js';
import { FRESH_AUTH_KEY } from '../decorators/fresh-auth.decorator.js';
import type { PejaRequest } from '../types/request.js';

/**
 * Enforces @RequireFreshAuth(maxAgeSec) on top of AuthGuard. Runs after
 * AuthGuard, so req.sessionFreshAuthAt is already populated.
 */
@Injectable()
export class FreshAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const maxAge = this.reflector.getAllAndOverride<number>(FRESH_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!maxAge) return true;

    const req = context.switchToHttp().getRequest<PejaRequest>();
    const fresh = req.sessionFreshAuthAt;
    if (!fresh) {
      throw new ForbiddenError(
        'Re-authentication required',
        'errors:fresh_auth_required',
      );
    }
    if ((Date.now() - fresh.getTime()) / 1000 > maxAge) {
      throw new ForbiddenError(
        'Re-authentication required',
        'errors:fresh_auth_required',
      );
    }
    return true;
  }
}
