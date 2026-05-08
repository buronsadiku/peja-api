# Swagger Response Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full response schema documentation to Swagger using `nestjs-zod` and a generic `{ data: T }` envelope wrapper.

**Architecture:** Install `nestjs-zod`, enable the Swagger CLI plugin, convert all Zod `type` exports to `class extends createZodDto()`, create response DTOs per module, and wire `@ApiResponse({ type })` into every controller. A shared `ApiDataResponse(T)` wrapper handles the `{ data: ... }` envelope. Common errors (401/403/500) are documented globally.

**Tech Stack:** NestJS, `nestjs-zod`, `@nestjs/swagger` CLI plugin, Zod

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `nestjs-zod` |
| `nest-cli.json` | Modify | Enable Swagger plugin |
| `src/common/swagger/api-data-response.ts` | Create | `ApiDataResponse(T)` wrapper + `ApiErrorResponse` |
| `src/common/swagger/global-errors.ts` | Create | Decorator for 401/403/500 on protected endpoints |
| `src/modules/auth/auth.schemas.ts` | Modify | Convert types to classes via `createZodDto` |
| `src/modules/auth/auth.responses.ts` | Create | Response DTOs for auth endpoints |
| `src/modules/auth/auth.controller.ts` | Modify | Add response types to `@ApiResponse` |
| `src/modules/events/events.schemas.ts` | Modify | Convert types to classes |
| `src/modules/events/events.responses.ts` | Create | Response DTOs for events |
| `src/modules/events/events.controller.ts` | Modify | Add response types |
| `src/modules/messages/messages.schemas.ts` | Modify | Convert types to classes |
| `src/modules/messages/messages.responses.ts` | Create | Response DTOs for messages |
| `src/modules/messages/messages.controller.ts` | Modify | Add response types |
| `src/modules/orders/orders.schemas.ts` | Create | Extract inline schemas from controller |
| `src/modules/orders/orders.responses.ts` | Create | Response DTOs for orders |
| `src/modules/orders/orders.controller.ts` | Modify | Import schemas, add response types |
| `src/modules/payments/payments.schemas.ts` | Modify | Convert types to classes |
| `src/modules/payments/payments.responses.ts` | Create | Response DTOs for payments |
| `src/modules/payments/payments.controller.ts` | Modify | Add response types |
| `src/modules/public/public.schemas.ts` | Modify | Convert types to classes |
| `src/modules/public/public.responses.ts` | Create | Response DTOs for public |
| `src/modules/public/public.controller.ts` | Modify | Add response types |
| `src/modules/keepsakes/keepsakes.schemas.ts` | Modify | Convert types to classes |
| `src/modules/keepsakes/keepsakes.responses.ts` | Create | Response DTOs for keepsakes |
| `src/modules/keepsakes/keepsakes.controller.ts` | Modify | Add response types |
| `src/modules/jobs/jobs.responses.ts` | Create | Response DTOs for jobs |
| `src/modules/jobs/jobs.controller.ts` | Modify | Add response types |
| `src/modules/health/health.responses.ts` | Create | Response DTOs for health |
| `src/modules/health/health.controller.ts` | Modify | Add response types |
| `src/modules/admin/admin.schemas.ts` | Create | Extract inline schemas |
| `src/modules/admin/admin.responses.ts` | Create | Response DTOs for admin |
| `src/modules/admin/admin.controller.ts` | Modify | Import schemas, add response types |
| `src/main.ts` | Modify | Register global error models |

---

### Task 1: Install nestjs-zod and enable Swagger plugin

**Files:**
- Modify: `package.json`
- Modify: `nest-cli.json`

- [ ] **Step 1: Install nestjs-zod**

Run: `npm install nestjs-zod`

- [ ] **Step 2: Enable Swagger CLI plugin in `nest-cli.json`**

Replace `compilerOptions` in `nest-cli.json` with:

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      {
        "include": "common/i18n/translations/**/*.json",
        "watchAssets": true
      }
    ],
    "plugins": [
      {
        "@nestjs/swagger": {
          "classValidatorShim": false,
          "introspectComments": true
        }
      }
    ]
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json nest-cli.json
git commit -m "chore: install nestjs-zod and enable Swagger CLI plugin"
```

---

### Task 2: Create Swagger helpers (ApiDataResponse + ApiErrorResponse + global errors)

**Files:**
- Create: `src/common/swagger/api-data-response.ts`
- Create: `src/common/swagger/global-errors.ts`

- [ ] **Step 1: Create `src/common/swagger/api-data-response.ts`**

```typescript
import { ApiProperty, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export class ApiErrorDetail {
  @ApiProperty({ example: 'UNAUTHORIZED' })
  code!: string;

  @ApiProperty({ example: 'Invalid email or password' })
  message!: string;

  @ApiProperty({ example: {} })
  details!: Record<string, unknown>;
}

export class ApiErrorResponseDto {
  @ApiProperty({ type: ApiErrorDetail })
  error!: ApiErrorDetail;
}

const dataResponseCache = new Map<string, Type>();

export function ApiDataResponse<T extends Type>(dataDto: T): Type {
  const key = dataDto.name;
  const cached = dataResponseCache.get(key);
  if (cached) return cached;

  class DataResponseDto {
    @ApiProperty({ type: dataDto })
    data!: InstanceType<T>;
  }

  Object.defineProperty(DataResponseDto, 'name', {
    value: `DataResponse${key}`,
  });

  dataResponseCache.set(key, DataResponseDto);
  return DataResponseDto;
}

export function ApiDataArrayResponse<T extends Type>(dataDto: T): Type {
  const key = `Array${dataDto.name}`;
  const cached = dataResponseCache.get(key);
  if (cached) return cached;

  class DataArrayResponseDto {
    @ApiProperty({ type: [dataDto] })
    data!: Array<InstanceType<T>>;

    @ApiProperty({ type: String, nullable: true, example: null })
    nextCursor!: string | null;
  }

  Object.defineProperty(DataArrayResponseDto, 'name', {
    value: `DataArrayResponse${key}`,
  });

  dataResponseCache.set(key, DataArrayResponseDto);
  return DataArrayResponseDto;
}

export function ApiSuccessResponse(
  status: number,
  description: string,
  dataDto: Type,
) {
  return applyDecorators(
    ApiExtraModels(dataDto),
    ApiResponse({
      status,
      description,
      type: ApiDataResponse(dataDto),
    }),
  );
}

export function ApiPaginatedResponse(description: string, dataDto: Type) {
  return applyDecorators(
    ApiExtraModels(dataDto),
    ApiResponse({
      status: 200,
      description,
      type: ApiDataArrayResponse(dataDto),
    }),
  );
}
```

- [ ] **Step 2: Create `src/common/swagger/global-errors.ts`**

```typescript
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run ts-check`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/common/swagger/
git commit -m "feat: add Swagger response helpers (ApiDataResponse, ApiErrorResponse, global errors)"
```

---

### Task 3: Convert auth schemas + add auth response DTOs + update auth controller

**Files:**
- Modify: `src/modules/auth/auth.schemas.ts`
- Create: `src/modules/auth/auth.responses.ts`
- Modify: `src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Update `src/modules/auth/auth.schemas.ts`**

Replace all `export type XxxDto = z.infer<typeof xxxSchema>` with `export class XxxDto extends createZodDto(xxxSchema) {}`. The full file:

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { SUPPORTED_LANGUAGES } from '../../common/constants.js';

// --- Auth endpoint schemas ---

export const signUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    fullName: z.string().min(1).max(100).optional(),
  })
  .strict();

export class SignUpDto extends createZodDto(signUpSchema) {}

export const signInSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export class SignInDto extends createZodDto(signInSchema) {}

export const magicLinkSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

export class MagicLinkDto extends createZodDto(magicLinkSchema) {}

export const oauthUrlSchema = z
  .object({
    provider: z.enum(['google', 'apple']),
    redirectTo: z.string().url(),
  })
  .strict();

export class OAuthUrlDto extends createZodDto(oauthUrlSchema) {}

export const oauthCallbackSchema = z
  .object({
    code: z.string().min(1),
  })
  .strict();

export class OAuthCallbackDto extends createZodDto(oauthCallbackSchema) {}

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export class RefreshDto extends createZodDto(refreshSchema) {}

export const forgotPasswordSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}

export const resetPasswordSchema = z
  .object({
    accessToken: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}

export const verifyEmailSchema = z
  .object({
    tokenHash: z.string().min(1),
    type: z.enum(['email', 'email_change']).default('email'),
  })
  .strict();

export class VerifyEmailDto extends createZodDto(verifyEmailSchema) {}

// --- Profile schemas ---

export const updateProfileSchema = z
  .object({
    fullName: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().url().optional(),
    preferredLanguage: z.enum(SUPPORTED_LANGUAGES).optional(),
    emailPreferences: z
      .object({
        marketing: z.boolean(),
        digest: z.boolean(),
        alerts: z.boolean(),
      })
      .optional(),
  })
  .strict();

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
```

- [ ] **Step 2: Create `src/modules/auth/auth.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  preferredLanguage: z.string(),
  role: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class UserDto extends createZodDto(userSchema) {}

const authResultSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

export class AuthResultDto extends createZodDto(authResultSchema) {}

const messageResultSchema = z.object({
  message: z.string(),
});

export class MessageResultDto extends createZodDto(messageResultSchema) {}

const oauthUrlResultSchema = z.object({
  url: z.string().url(),
});

export class OAuthUrlResultDto extends createZodDto(oauthUrlResultSchema) {}

export class UserWrapperDto {
  @ApiProperty({ type: UserDto })
  user!: UserDto;
}
```

- [ ] **Step 3: Update `src/modules/auth/auth.controller.ts`**

Add imports at the top (after existing imports):

```typescript
import {
  ApiSuccessResponse,
  ApiValidationError,
  ApiCommonErrors,
  ApiConflictError,
} from '../../common/swagger/api-data-response.js';
import {
  ApiCommonErrors,
  ApiNotFoundError,
  ApiValidationError,
  ApiConflictError,
} from '../../common/swagger/global-errors.js';
import {
  AuthResultDto,
  MessageResultDto,
  OAuthUrlResultDto,
  UserWrapperDto,
} from './auth.responses.js';
```

Then update each endpoint's `@ApiResponse` decorator. Replace each `@ApiResponse({ status: ..., description: '...' })` with the proper helpers. Example for signUp:

Replace:
```typescript
  @ApiResponse({ status: 201, description: 'Verification email sent' })
```
With:
```typescript
  @ApiSuccessResponse(201, 'Verification email sent', MessageResultDto)
  @ApiValidationError()
  @ApiConflictError()
```

Full mapping for all auth endpoints:

| Endpoint | Response type | Extra errors |
|---|---|---|
| `signUp` | `MessageResultDto` (201) | `@ApiValidationError()`, `@ApiConflictError()` |
| `signIn` | `AuthResultDto` (200) | `@ApiValidationError()` |
| `magicLink` | `MessageResultDto` (200) | `@ApiValidationError()` |
| `oauthUrl` | `OAuthUrlResultDto` (200) | `@ApiValidationError()` |
| `oauthCallback` | `AuthResultDto` (200) | `@ApiValidationError()` |
| `refresh` | `AuthResultDto` (200) | `@ApiValidationError()` |
| `forgotPassword` | `MessageResultDto` (200) | `@ApiValidationError()` |
| `resetPassword` | `MessageResultDto` (200) | `@ApiValidationError()` |
| `verifyEmail` | `AuthResultDto` (200) | `@ApiValidationError()` |
| `signOut` | `MessageResultDto` (200) | `@ApiCommonErrors()` |
| `me` | `UserWrapperDto` (200) | `@ApiCommonErrors()` |
| `updateMe` | `UserWrapperDto` (200) | `@ApiCommonErrors()`, `@ApiValidationError()` |
| `deleteMe` | `MessageResultDto` (202) | `@ApiCommonErrors()` |

Remove the old `@ApiResponse` decorators and replace with the helpers above, plus `@ApiSuccessResponse(status, description, DtoClass)`.

- [ ] **Step 4: Verify TypeScript compiles and build works**

Run: `npm run ts-check && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/
git commit -m "feat: add Swagger response docs for auth endpoints"
```

---

### Task 4: Events schemas + responses + controller

**Files:**
- Modify: `src/modules/events/events.schemas.ts`
- Create: `src/modules/events/events.responses.ts`
- Modify: `src/modules/events/events.controller.ts`

- [ ] **Step 1: Update `src/modules/events/events.schemas.ts`**

Add `import { createZodDto } from 'nestjs-zod';` and convert all `type` exports:

```typescript
export class CreateEventDto extends createZodDto(createEventSchema) {}
export class UpdateEventDto extends createZodDto(updateEventSchema) {}
```

Remove the old `export type` lines.

- [ ] **Step 2: Create `src/modules/events/events.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const eventSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  slug: z.string(),
  partnerAName: z.string(),
  partnerBName: z.string(),
  weddingDate: z.string().nullable(),
  venueName: z.string().nullable(),
  venueCity: z.string().nullable(),
  expectedGuests: z.number().nullable(),
  welcomeMessage: z.string().nullable(),
  themeColor: z.string(),
  couplePhotoUrl: z.string().nullable(),
  planTier: z.string().nullable(),
  messageLimit: z.number().nullable(),
  status: z.string(),
  defaultLanguage: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export class EventDto extends createZodDto(eventSchema) {}

export class EventWrapperDto {
  @ApiProperty({ type: EventDto })
  event!: EventDto;
}

const qrCodeResultSchema = z.object({
  url: z.string().nullable(),
  shortUrl: z.string(),
  format: z.enum(['png', 'svg']),
});

export class QrCodeResultDto extends createZodDto(qrCodeResultSchema) {}

const eventStatsSchema = z.object({
  totalMessages: z.number(),
  audioMessages: z.number(),
  videoMessages: z.number(),
  photoMessages: z.number(),
  writtenMessages: z.number(),
  favorites: z.number(),
});

export class EventStatsDto extends createZodDto(eventStatsSchema) {}
```

- [ ] **Step 3: Update `src/modules/events/events.controller.ts`**

Add imports for `ApiSuccessResponse`, `ApiPaginatedResponse`, `ApiCommonErrors`, `ApiNotFoundError`, `ApiValidationError` from swagger helpers and `EventWrapperDto`, `EventDto`, `QrCodeResultDto`, `EventStatsDto` from responses.

Replace each `@ApiResponse(...)` with proper helpers:

| Endpoint | Response helper |
|---|---|
| `create` | `@ApiSuccessResponse(201, 'Event created', EventWrapperDto)` + `@ApiValidationError()` |
| `list` | `@ApiPaginatedResponse('Paginated list of events', EventDto)` |
| `findOne` | `@ApiSuccessResponse(200, 'Event details', EventWrapperDto)` + `@ApiNotFoundError()` |
| `update` | `@ApiSuccessResponse(200, 'Event updated', EventWrapperDto)` + `@ApiNotFoundError()` + `@ApiValidationError()` |
| `remove` | Keep `@ApiResponse({ status: 204, description: 'Event deleted' })` |
| `archive` | `@ApiSuccessResponse(200, 'Event archived', EventWrapperDto)` |
| `qrCode` | `@ApiSuccessResponse(200, 'QR code data', QrCodeResultDto)` + `@ApiNotFoundError()` |
| `stats` | `@ApiSuccessResponse(200, 'Event statistics', EventStatsDto)` + `@ApiNotFoundError()` |

Add `@ApiCommonErrors()` at class level.

- [ ] **Step 4: Verify and commit**

Run: `npm run ts-check && npm run build`

```bash
git add src/modules/events/
git commit -m "feat: add Swagger response docs for events endpoints"
```

---

### Task 5: Messages schemas + responses + controller

**Files:**
- Modify: `src/modules/messages/messages.schemas.ts`
- Create: `src/modules/messages/messages.responses.ts`
- Modify: `src/modules/messages/messages.controller.ts`

- [ ] **Step 1: Update `src/modules/messages/messages.schemas.ts`**

Add `import { createZodDto } from 'nestjs-zod';` and convert:

```typescript
export class UpdateMessageDto extends createZodDto(updateMessageSchema) {}
export class ListMessagesQuery extends createZodDto(listMessagesQuerySchema) {}
```

Remove old `export type` lines.

- [ ] **Step 2: Create `src/modules/messages/messages.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const messageSummarySchema = z.object({
  id: z.string().uuid(),
  guestNames: z.string(),
  hasAudio: z.boolean(),
  hasVideo: z.boolean(),
  hasPhoto: z.boolean(),
  audioDurationSec: z.number().nullable(),
  transcriptSnippet: z.string().nullable(),
  isFavorite: z.boolean(),
  createdAt: z.coerce.date(),
  photoThumbUrl: z.string().nullable(),
});

export class MessageSummaryDto extends createZodDto(messageSummarySchema) {}

const messageDetailSchema = z.object({
  id: z.string().uuid(),
  guestNames: z.string(),
  audioUrl: z.string().nullable(),
  audioDurationSec: z.number().nullable(),
  videoUrl: z.string().nullable(),
  photoUrl: z.string().nullable(),
  writtenNote: z.string().nullable(),
  transcript: z.string().nullable(),
  transcriptLanguage: z.string().nullable(),
  transcriptStatus: z.string(),
  isFavorite: z.boolean(),
  coupleNotes: z.string().nullable(),
  audioTrimStartSec: z.number().nullable(),
  audioTrimEndSec: z.number().nullable(),
  submissionSource: z.string(),
  createdAt: z.coerce.date(),
});

const messageDetailWrapperSchema = z.object({
  message: messageDetailSchema,
});

export class MessageDetailDto extends createZodDto(messageDetailWrapperSchema) {}

const messageRowSchema = z.object({
  id: z.string().uuid(),
  guestNames: z.string(),
  isFavorite: z.boolean(),
  createdAt: z.coerce.date(),
});

export class MessageRowDto extends createZodDto(messageRowSchema) {}

export class MessageWrapperDto {
  @ApiProperty({ type: MessageRowDto })
  message!: MessageRowDto;
}

const retranscribeResultSchema = z.object({
  jobId: z.string(),
});

export class RetranscribeResultDto extends createZodDto(retranscribeResultSchema) {}
```

- [ ] **Step 3: Update `src/modules/messages/messages.controller.ts`**

Add swagger helper and response imports. Replace `@ApiResponse` decorators:

| Endpoint | Response helper |
|---|---|
| `list` | `@ApiPaginatedResponse('Paginated list of messages', MessageSummaryDto)` |
| `detail` | `@ApiSuccessResponse(200, 'Message details', MessageDetailDto)` + `@ApiNotFoundError()` |
| `update` | `@ApiSuccessResponse(200, 'Message updated', MessageWrapperDto)` + `@ApiNotFoundError()` + `@ApiValidationError()` |
| `remove` | Keep `@ApiResponse({ status: 204, description: 'Message deleted' })` |
| `retranscribe` | `@ApiSuccessResponse(202, 'Retranscription queued', RetranscribeResultDto)` + `@ApiNotFoundError()` |

Add `@ApiCommonErrors()` at class level.

- [ ] **Step 4: Verify and commit**

Run: `npm run ts-check && npm run build`

```bash
git add src/modules/messages/
git commit -m "feat: add Swagger response docs for messages endpoints"
```

---

### Task 6: Orders — extract schemas + responses + controller

**Files:**
- Create: `src/modules/orders/orders.schemas.ts`
- Create: `src/modules/orders/orders.responses.ts`
- Modify: `src/modules/orders/orders.controller.ts`

- [ ] **Step 1: Create `src/modules/orders/orders.schemas.ts`**

Extract the inline schemas from the controller:

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const listOrdersQuerySchema = z
  .object({
    eventId: z.string().uuid().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export class ListOrdersQueryDto extends createZodDto(listOrdersQuerySchema) {}

export const refundSchema = z
  .object({
    amountCents: z.number().int().min(0).nullable().optional(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export class RefundDto extends createZodDto(refundSchema) {}
```

- [ ] **Step 2: Create `src/modules/orders/orders.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const orderSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
  orderType: z.string(),
  status: z.string(),
  currency: z.string(),
  subtotalCents: z.number(),
  totalCents: z.number(),
  paymentProvider: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export class OrderDto extends createZodDto(orderSchema) {}

const orderItemSchema = z.object({
  id: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  quantity: z.number(),
  unitPriceCents: z.number(),
});

export class OrderItemDto extends createZodDto(orderItemSchema) {}

const trackingSchema = z.object({
  carrier: z.string().nullable(),
  number: z.string().nullable(),
  url: z.string().nullable(),
});

const orderDetailSchema = z.object({
  order: z.object({
    id: z.string().uuid(),
    orderType: z.string(),
    status: z.string(),
    totalCents: z.number(),
    items: z.array(orderItemSchema),
    tracking: trackingSchema.nullable(),
    createdAt: z.coerce.date(),
  }),
});

export class OrderDetailDto extends createZodDto(orderDetailSchema) {}

export class OrderWrapperDto {
  @ApiProperty({ type: OrderDto })
  order!: OrderDto;
}
```

- [ ] **Step 3: Update `src/modules/orders/orders.controller.ts`**

Remove the inline `listOrdersQuerySchema` and `refundSchema` definitions. Import from `./orders.schemas.js`. Import response DTOs from `./orders.responses.js`. Import swagger helpers.

Replace `@ApiResponse` decorators:

| Endpoint | Response helper |
|---|---|
| `list` | `@ApiPaginatedResponse('Paginated list of orders', OrderDto)` |
| `detail` | `@ApiSuccessResponse(200, 'Order details', OrderDetailDto)` + `@ApiNotFoundError()` |
| `refund` | `@ApiSuccessResponse(200, 'Refund initiated', OrderWrapperDto)` + `@ApiNotFoundError()` |

Add `@ApiCommonErrors()` at class level.

- [ ] **Step 4: Verify and commit**

Run: `npm run ts-check && npm run build`

```bash
git add src/modules/orders/
git commit -m "feat: add Swagger response docs for orders endpoints"
```

---

### Task 7: Payments, Public, Keepsakes — schemas + responses + controllers

**Files:**
- Modify: `src/modules/payments/payments.schemas.ts`
- Create: `src/modules/payments/payments.responses.ts`
- Modify: `src/modules/payments/payments.controller.ts`
- Modify: `src/modules/public/public.schemas.ts`
- Create: `src/modules/public/public.responses.ts`
- Modify: `src/modules/public/public.controller.ts`
- Modify: `src/modules/keepsakes/keepsakes.schemas.ts`
- Create: `src/modules/keepsakes/keepsakes.responses.ts`
- Modify: `src/modules/keepsakes/keepsakes.controller.ts`

- [ ] **Step 1: Update `src/modules/payments/payments.schemas.ts`**

Add `import { createZodDto } from 'nestjs-zod';` and convert:

```typescript
export class CheckoutSessionDto extends createZodDto(checkoutSessionSchema) {}
```

- [ ] **Step 2: Create `src/modules/payments/payments.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const checkoutResultSchema = z.object({
  orderId: z.string().uuid(),
  checkoutUrl: z.string().url(),
  providerSessionId: z.string(),
});

export class CheckoutResultDto extends createZodDto(checkoutResultSchema) {}
```

- [ ] **Step 3: Update `src/modules/payments/payments.controller.ts`**

Import helpers and `CheckoutResultDto`. Replace `@ApiResponse`:

```typescript
@ApiSuccessResponse(201, 'Checkout session created', CheckoutResultDto)
@ApiValidationError()
@ApiCommonErrors()
```

- [ ] **Step 4: Update `src/modules/public/public.schemas.ts`**

Add `import { createZodDto } from 'nestjs-zod';` and convert:

```typescript
export class UploadUrlDto extends createZodDto(uploadUrlSchema) {}
export class CreateMessageDto extends createZodDto(createMessageSchema) {}
```

- [ ] **Step 5: Create `src/modules/public/public.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const publicEventSchema = z.object({
  partnerAName: z.string(),
  partnerBName: z.string(),
  weddingDate: z.string().nullable(),
  welcomeMessage: z.string().nullable(),
  themeColor: z.string(),
  couplePhotoUrl: z.string().nullable(),
  defaultLanguage: z.string(),
  supportedLanguages: z.array(z.string()),
  submissionOpen: z.boolean(),
  limitReached: z.boolean(),
});

export class PublicEventDto extends createZodDto(publicEventSchema) {}

const uploadTargetSchema = z.object({
  key: z.string(),
  url: z.string().url(),
  fields: z.record(z.string()).optional(),
});

const uploadUrlsResultSchema = z.object({
  uploadTargets: z.array(uploadTargetSchema),
});

export class UploadUrlsResultDto extends createZodDto(uploadUrlsResultSchema) {}

const createMessageResultSchema = z.object({
  message: z.object({
    id: z.string().uuid(),
    status: z.string(),
  }),
});

export class CreateMessageResultDto extends createZodDto(createMessageResultSchema) {}
```

- [ ] **Step 6: Update `src/modules/public/public.controller.ts`**

Import helpers and response DTOs. Replace `@ApiResponse` decorators:

| Endpoint | Response helper |
|---|---|
| `getEvent` | `@ApiSuccessResponse(200, 'Public event info', PublicEventDto)` + `@ApiNotFoundError()` |
| `uploadUrl` | `@ApiSuccessResponse(200, 'Presigned upload URLs', UploadUrlsResultDto)` |
| `createMessage` | `@ApiSuccessResponse(201, 'Message created', CreateMessageResultDto)` + `@ApiValidationError()` |
| `invitationOpen` | Keep `@ApiResponse({ status: 204, description: 'Open recorded' })` |

- [ ] **Step 7: Update `src/modules/keepsakes/keepsakes.schemas.ts`**

Add `import { createZodDto } from 'nestjs-zod';` and convert:

```typescript
export class GoldBookPreviewDto extends createZodDto(goldBookPreviewSchema) {}
export class VideoMontagePreviewDto extends createZodDto(videoMontagePreviewSchema) {}
```

- [ ] **Step 8: Create `src/modules/keepsakes/keepsakes.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const catalogItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  description: z.string(),
  priceCents: z.number(),
  currency: z.string(),
});

const catalogResultSchema = z.object({
  products: z.array(catalogItemSchema),
});

export class CatalogResultDto extends createZodDto(catalogResultSchema) {}

const previewResultSchema = z.object({
  jobId: z.string(),
});

export class PreviewResultDto extends createZodDto(previewResultSchema) {}
```

- [ ] **Step 9: Update `src/modules/keepsakes/keepsakes.controller.ts`**

Import helpers and response DTOs. Replace `@ApiResponse` decorators:

| Endpoint | Response helper |
|---|---|
| `catalog` | `@ApiSuccessResponse(200, 'Product catalog', CatalogResultDto)` |
| `goldBookPreview` | `@ApiSuccessResponse(202, 'Preview generation queued', PreviewResultDto)` + `@ApiValidationError()` |
| `videoMontagePreview` | `@ApiSuccessResponse(202, 'Preview generation queued', PreviewResultDto)` + `@ApiValidationError()` |

Add `@ApiCommonErrors()` at class level.

- [ ] **Step 10: Verify and commit**

Run: `npm run ts-check && npm run build`

```bash
git add src/modules/payments/ src/modules/public/ src/modules/keepsakes/
git commit -m "feat: add Swagger response docs for payments, public, and keepsakes"
```

---

### Task 8: Jobs, Health, Admin — schemas + responses + controllers

**Files:**
- Create: `src/modules/jobs/jobs.responses.ts`
- Modify: `src/modules/jobs/jobs.controller.ts`
- Create: `src/modules/health/health.responses.ts`
- Modify: `src/modules/health/health.controller.ts`
- Create: `src/modules/admin/admin.schemas.ts`
- Create: `src/modules/admin/admin.responses.ts`
- Modify: `src/modules/admin/admin.controller.ts`

- [ ] **Step 1: Create `src/modules/jobs/jobs.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ApiProperty } from '@nestjs/swagger';

const jobSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  progress: z.number().nullable(),
  result: z.unknown().nullable(),
  error: z.string().nullable(),
});

export class JobDto extends createZodDto(jobSchema) {}

export class JobWrapperDto {
  @ApiProperty({ type: JobDto })
  job!: JobDto;
}
```

- [ ] **Step 2: Update `src/modules/jobs/jobs.controller.ts`**

Import helpers and `JobWrapperDto`. Replace `@ApiResponse` decorators:

```typescript
@ApiSuccessResponse(200, 'Job status', JobWrapperDto)
@ApiNotFoundError()
@ApiCommonErrors()
```

- [ ] **Step 3: Create `src/modules/health/health.responses.ts`**

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const healthSchema = z.object({
  status: z.enum(['ok']),
});

export class HealthDto extends createZodDto(healthSchema) {}

const healthCheckSchema = z.object({
  status: z.enum(['ok', 'error']),
  latencyMs: z.number().optional(),
  error: z.string().optional(),
});

const readySchema = z.object({
  status: z.enum(['ok', 'degraded']),
  checks: z.record(healthCheckSchema),
});

export class ReadyDto extends createZodDto(readySchema) {}
```

- [ ] **Step 4: Update `src/modules/health/health.controller.ts`**

Import `ApiSuccessResponse` and response DTOs. Replace `@ApiResponse`:

```typescript
// health endpoint
@ApiSuccessResponse(200, 'Service is alive', HealthDto)

// ready endpoint
@ApiSuccessResponse(200, 'Service readiness with dependency checks', ReadyDto)
```

- [ ] **Step 5: Create `src/modules/admin/admin.schemas.ts`**

Extract inline schemas from the controller:

```typescript
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const markShippedSchema = z
  .object({
    carrier: z.string().min(1),
    trackingNumber: z.string().min(1),
    trackingUrl: z.string().url().optional(),
  })
  .strict();

export class MarkShippedDto extends createZodDto(markShippedSchema) {}

export const paginationSchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export class PaginationDto extends createZodDto(paginationSchema) {}
```

- [ ] **Step 6: Create `src/modules/admin/admin.responses.ts`**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { EventDto } from '../events/events.responses.js';
import { OrderDto } from '../orders/orders.responses.js';
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export class AdminOrderWrapperDto {
  @ApiProperty({ type: OrderDto })
  order!: OrderDto;
}

const webhookLogSchema = z.object({
  id: z.string().uuid(),
  provider: z.string(),
  eventType: z.string(),
  status: z.string(),
  receivedAt: z.coerce.date(),
});

export class WebhookLogDto extends createZodDto(webhookLogSchema) {}
```

- [ ] **Step 7: Update `src/modules/admin/admin.controller.ts`**

Remove inline `markShippedSchema` and `paginationSchema`. Import from `./admin.schemas.js`. Import response DTOs and helpers.

Replace `@ApiResponse` decorators:

| Endpoint | Response helper |
|---|---|
| `listEvents` | `@ApiPaginatedResponse('Paginated list of all events', EventDto)` |
| `listOrders` | `@ApiPaginatedResponse('Paginated list of all orders', OrderDto)` |
| `markShipped` | `@ApiSuccessResponse(200, 'Order marked as shipped', AdminOrderWrapperDto)` + `@ApiNotFoundError()` |
| `listWebhooks` | `@ApiPaginatedResponse('Paginated list of webhook events', WebhookLogDto)` |

Add `@ApiCommonErrors()` at class level.

- [ ] **Step 8: Verify and commit**

Run: `npm run ts-check && npm run build`

```bash
git add src/modules/jobs/ src/modules/health/ src/modules/admin/
git commit -m "feat: add Swagger response docs for jobs, health, and admin"
```

---

### Task 9: Update main.ts with global error models

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update Swagger setup in `src/main.ts`**

After the `const document = SwaggerModule.createDocument(app, config);` line, the `ApiErrorResponseDto` is already auto-discovered through the `@ApiResponse` decorators. No manual `@ApiExtraModels` registration needed since we use `ApiErrorResponseDto` in `global-errors.ts` which is applied to endpoints.

No changes needed — the plugin + decorators handle everything.

- [ ] **Step 2: Final verification**

Run: `npm run ts-check && npm run lint && npm run build`
Expected: All pass

- [ ] **Step 3: Start the server and verify Swagger**

Run: `npm run start:dev`
Navigate to: `http://localhost:3001/docs`
Verify: Response schemas appear on all endpoints

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any remaining Swagger documentation issues"
```
