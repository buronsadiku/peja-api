import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PejaRequest } from '../types/request.js';

export const CurrentEvent = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<PejaRequest>();
    const event = request.currentEvent;
    return data ? event?.[data] : event;
  },
);
