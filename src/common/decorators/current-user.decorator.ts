import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PejaRequest } from '../types/request.js';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<PejaRequest>();
    const user = request.currentUser;
    return data ? user?.[data] : user;
  },
);
