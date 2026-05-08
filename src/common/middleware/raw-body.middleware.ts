import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import type { PejaRequest } from '../types/request.js';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: PejaRequest, _res: Response, next: NextFunction) {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
    });
    next();
  }
}
