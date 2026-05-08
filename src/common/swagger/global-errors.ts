import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiErrorResponseDto } from './api-data-response.js';

export function ApiCommonErrors() {
  return applyDecorators(
    ApiResponse({
      status: 401,
      description: 'Unauthorized',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiNotFoundError() {
  return applyDecorators(
    ApiResponse({
      status: 404,
      description: 'Resource not found',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiValidationError() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'Validation error',
      type: ApiErrorResponseDto,
    }),
  );
}

export function ApiConflictError() {
  return applyDecorators(
    ApiResponse({
      status: 409,
      description: 'Conflict',
      type: ApiErrorResponseDto,
    }),
  );
}
