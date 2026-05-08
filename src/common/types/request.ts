import type { Request } from 'express';

export interface PejaRequest extends Request {
  currentUser?: {
    id: string;
    email: string;
    role: string;
    deletedAt: Date | null;
    [key: string]: unknown;
  };
  currentEvent?: Record<string, unknown>;
  traceId?: string;
  sessionId?: string;
  sessionRisk?: number;
  sessionFreshAuthAt?: Date;
  rawBody?: Buffer;
}
