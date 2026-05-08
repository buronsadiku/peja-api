import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import type { PejaRequest } from '../types/request.js';

@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<PejaRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    const traceparent = request.headers['traceparent'];
    const traceId =
      typeof traceparent === 'string'
        ? traceparent.split('-')[1]
        : randomUUID();

    request.traceId = traceId;
    response.setHeader('X-Trace-Id', traceId ?? '');

    return next.handle();
  }
}
