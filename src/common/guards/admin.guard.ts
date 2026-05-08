import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ForbiddenError } from '../errors/errors.js';
import type { PejaRequest } from '../types/request.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PejaRequest>();
    const user = request.currentUser;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenError(
        'Admin access required',
        'errors:admin_required',
      );
    }

    return true;
  }
}
