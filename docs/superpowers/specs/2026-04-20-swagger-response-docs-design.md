# Swagger Response Documentation — Design Spec

## Overview

Add full response schema documentation to Swagger by bridging Zod schemas to Swagger-compatible classes using `nestjs-zod`, enabling the NestJS Swagger CLI plugin, and creating a generic `{ data: T }` envelope wrapper.

## Approach

- Use `nestjs-zod`'s `createZodDto` to convert Zod schemas into classes with runtime metadata
- Enable the NestJS Swagger CLI plugin for auto-inference
- Create a generic `ApiDataResponse(T)` wrapper for the `{ data: ... }` envelope
- Create a shared `ApiErrorResponse` for error envelopes
- Document common errors (401/403/500) globally; specific errors (404/409/422/429) per-endpoint

## Envelope Pattern

### Success response wrapper

`ApiDataResponse(T)` generates a class Swagger can read:

```json
{
  "data": { ... }  // T's shape
}
```

Used in controllers as:
```typescript
@ApiResponse({ status: 200, type: ApiDataResponse(SignInResponseDto) })
```

### Error response

Single shared `ApiErrorResponse`:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password",
    "details": {}
  }
}
```

### Global vs per-endpoint errors

- **Global (all protected endpoints):** 401 Unauthorized, 403 Forbidden, 500 Internal Error
- **Per-endpoint only:** 404 Not Found, 409 Conflict, 422 Validation Error, 429 Rate Limited

## File Organization

### New files

| File | Responsibility |
|---|---|
| `src/common/swagger/api-data-response.ts` | `ApiDataResponse(T)` wrapper + `ApiErrorResponse` class |
| `src/common/swagger/global-errors.ts` | Decorator applying 401/403/500 error docs to protected endpoints |
| `src/modules/auth/auth.responses.ts` | Response Zod schemas + DTOs for auth endpoints |
| `src/modules/events/events.responses.ts` | Response DTOs for events endpoints |
| `src/modules/messages/messages.responses.ts` | Response DTOs for messages endpoints |
| `src/modules/orders/orders.responses.ts` | Response DTOs for orders endpoints |
| `src/modules/payments/payments.responses.ts` | Response DTOs for payments endpoints |
| `src/modules/public/public.responses.ts` | Response DTOs for public endpoints |
| `src/modules/keepsakes/keepsakes.responses.ts` | Response DTOs for keepsakes endpoints |
| `src/modules/jobs/jobs.responses.ts` | Response DTOs for jobs endpoints |
| `src/modules/admin/admin.responses.ts` | Response DTOs for admin endpoints |
| `src/modules/health/health.responses.ts` | Response DTOs for health endpoints |

### Modified files

| File | Change |
|---|---|
| `nest-cli.json` | Enable `@nestjs/swagger` plugin |
| `package.json` | Add `nestjs-zod` |
| `src/main.ts` | Register global error models |
| `src/modules/auth/auth.schemas.ts` | Convert `type` to `class extends createZodDto()` |
| All other `*.schemas.ts` files | Same conversion |
| All controllers | Add `@ApiResponse({ type: ... })` with response DTOs |

## Conversion Pattern

### Request DTOs (schemas.ts files)

Before:
```typescript
export const signUpSchema = z.object({ ... }).strict();
export type SignUpDto = z.infer<typeof signUpSchema>;
```

After:
```typescript
import { createZodDto } from 'nestjs-zod';
export const signUpSchema = z.object({ ... }).strict();
export class SignUpDto extends createZodDto(signUpSchema) {}
```

### Response DTOs (responses.ts files)

```typescript
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const userResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  role: z.string(),
  // ... other fields
});

export class UserResponseDto extends createZodDto(userResponseSchema) {}

const signInResponseSchema = z.object({
  user: userResponseSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export class SignInResponseDto extends createZodDto(signInResponseSchema) {}
```

### Controller usage

```typescript
@ApiResponse({ status: 200, type: ApiDataResponse(SignInResponseDto) })
async signIn(...) { ... }
```

Controllers stay lean — response types are imported from `*.responses.ts`.

## Controller size management

- Request DTOs stay in `*.schemas.ts`
- Response DTOs in `*.responses.ts`
- Swagger decorators reference imported types only — no inline schemas
- Shared types (UserResponseDto, PaginatedResponseDto) extracted to `src/common/swagger/`
