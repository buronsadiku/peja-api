import { AppError } from './app.error.js';

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', i18nKey = 'errors:unauthorized') {
    super('UNAUTHORIZED', 401, message, undefined, i18nKey);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', i18nKey = 'errors:forbidden') {
    super('FORBIDDEN', 403, message, undefined, i18nKey);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      'NOT_FOUND',
      404,
      `${resource} not found`,
      id ? { id } : undefined,
      'errors:not_found',
      { resource },
    );
  }
}

export class ValidationError extends AppError {
  constructor(fields: Record<string, string>) {
    super(
      'VALIDATION_ERROR',
      400,
      'Request validation failed',
      { fields },
      'errors:validation_failed',
    );
  }
}

export class RateLimitedError extends AppError {
  constructor(retryAfterSec: number) {
    super(
      'RATE_LIMITED',
      429,
      'Too many requests',
      { retryAfterSec },
      'errors:too_many_requests',
    );
  }
}

export class DuplicateSubmissionError extends AppError {
  constructor() {
    super(
      'DUPLICATE_SUBMISSION',
      409,
      'Idempotency key already used with different body',
      undefined,
      'errors:duplicate_submission',
    );
  }
}

export class MessageLimitReachedError extends AppError {
  constructor() {
    super(
      'MESSAGE_LIMIT_REACHED',
      403,
      'Message limit reached for this event',
      undefined,
      'errors:message_limit_reached',
    );
  }
}

export class EventNotActiveError extends AppError {
  constructor() {
    super(
      'EVENT_NOT_ACTIVE',
      403,
      'Event is not active',
      undefined,
      'errors:event_not_active',
    );
  }
}

export class EventExpiredError extends AppError {
  constructor() {
    super(
      'EVENT_EXPIRED',
      403,
      'Event storage has expired',
      undefined,
      'errors:event_expired',
    );
  }
}

export class PaymentFailedError extends AppError {
  constructor(message = 'Payment failed', i18nKey = 'errors:payment_failed') {
    super('PAYMENT_FAILED', 402, message, undefined, i18nKey);
  }
}

export class UploadFailedError extends AppError {
  constructor(key: string) {
    super(
      'UPLOAD_FAILED',
      422,
      'File not found in storage after upload',
      { key },
      'errors:upload_failed',
    );
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', i18nKey = 'errors:conflict') {
    super('CONFLICT', 409, message, undefined, i18nKey);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Service unavailable',
    i18nKey = 'errors:service_unavailable',
  ) {
    super('SERVICE_UNAVAILABLE', 503, message, undefined, i18nKey);
  }
}

export class InvalidOriginError extends AppError {
  constructor() {
    super(
      'INVALID_ORIGIN',
      403,
      'Request origin not allowed',
      undefined,
      'errors:invalid_origin',
    );
  }
}

export class InvalidSubmissionError extends AppError {
  constructor(reason: string) {
    super(
      'INVALID_SUBMISSION',
      403,
      'Submission rejected',
      { reason },
      'errors:invalid_submission',
    );
  }
}
