# Backend Auth APIs — Design Spec

## Overview

Move all authentication flows through the backend by wrapping Supabase's GoTrue API via `@supabase/supabase-js`. The client never talks to Supabase directly for auth — all sign-in, sign-up, OAuth, token refresh, and password management goes through our API.

## Auth Methods

- Email/password sign-up and sign-in
- Google OAuth
- Apple OAuth
- Magic link (passwordless email)
- Token refresh
- Password reset (forgot → email → set new)
- Email verification (required before access)

## Endpoints

All `POST /api/v1/auth/`:

| Endpoint | Public | Description |
|---|---|---|
| `signup` | Yes | Email/password registration. Returns user (pending email verification). |
| `signin` | Yes | Email/password login. Returns access + refresh tokens. Rejects if email not verified. |
| `magic-link` | Yes | Sends magic link email. No tokens returned. |
| `oauth/url` | Yes | Returns OAuth redirect URL for Google or Apple. |
| `oauth/callback` | Yes | Exchanges OAuth code for tokens, upserts local user. |
| `refresh` | Yes | Exchanges refresh token for new token pair. |
| `forgot-password` | Yes | Sends password reset email. |
| `reset-password` | Yes | Sets new password using reset token. |
| `verify-email` | Yes | Confirms email with verification token, upserts local user, returns tokens. |
| `signout` | Protected | Revokes session on Supabase side. |

The existing `POST /api/v1/auth/callback` endpoint is removed. `GET/PATCH/DELETE /api/v1/auth/me` stay as-is.

## Architecture

### New env vars

- `SUPABASE_URL` — project URL (e.g. `https://xyz.supabase.co`)
- `SUPABASE_ANON_KEY` — public anon key for user-facing auth calls
- `SUPABASE_SERVICE_ROLE_KEY` — admin key for server-side user management

### Service layer

```
Client -> AuthController -> AuthService -> SupabaseAuthProvider -> Supabase GoTrue
                                |
                          UsersService (upsert local user record)
```

**SupabaseAuthProvider** — thin wrapper around `@supabase/supabase-js`. All Supabase calls live here. No Supabase types leak into the rest of the codebase.

**AuthService** — orchestrates SupabaseAuthProvider + UsersService. Handles the upsert-after-auth pattern.

**AuthController** — route handlers with Zod validation. Delegates to AuthService.

**AuthGuard** — unchanged. Still verifies JWTs via JWKS.

### Endpoint flows

- **signup**: `supabase.auth.signUp()` → Supabase sends verification email → return success message (no tokens until verified)
- **signin**: `supabase.auth.signInWithPassword()` → if email not verified, reject → upsert local user → return tokens
- **magic-link**: `supabase.auth.signInWithOtp()` → return success message
- **oauth/url**: `supabase.auth.signInWithOAuth()` with `skipBrowserRedirect: true` → return the URL
- **oauth/callback**: `supabase.auth.exchangeCodeForSession()` → upsert local user → return tokens
- **refresh**: `supabase.auth.refreshSession()` → return new tokens
- **forgot-password**: `supabase.auth.resetPasswordForEmail()` → return success
- **reset-password**: `supabase.auth.updateUser()` with new password using recovery token
- **verify-email**: Exchange the verification token via Supabase → upsert local user → return tokens
- **signout**: `supabase.auth.admin.signOut()` to revoke the session

### Token response shape

Consistent across all token-returning endpoints:

```json
{
  "data": {
    "user": { "id": "...", "email": "...", "..." : "..." },
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600
  }
}
```

## Error Handling

Supabase errors mapped to existing error classes:

| Supabase error | Backend error |
|---|---|
| Invalid credentials | `UnauthorizedError('Invalid email or password')` |
| Email not confirmed | `UnauthorizedError('Email not verified')` |
| User already registered | `ConflictError('Email already registered')` |
| Invalid refresh token | `UnauthorizedError('Invalid refresh token')` |
| Invalid/expired reset token | `UnauthorizedError('Invalid or expired token')` |
| Rate limited by Supabase | `RateLimitedError(retryAfterSec)` |
| Supabase unavailable | `ServiceUnavailableError('Auth service unavailable')` |

New error classes to add:
- `ConflictError` (409) — for duplicate email registration
- `ServiceUnavailableError` (503) — for Supabase downtime

## File Changes

### New files
- `src/modules/auth/supabase-auth.provider.ts` — wraps `@supabase/supabase-js`
- `src/modules/auth/auth.schemas.ts` — expanded with schemas for all new endpoints (replaces current content)

### Modified files
- `src/modules/auth/auth.controller.ts` — new route handlers, remove old `callback`
- `src/modules/auth/auth.service.ts` — orchestrates SupabaseAuthProvider + UsersService, remove old JWKS logic
- `src/modules/auth/auth.module.ts` — register SupabaseAuthProvider
- `src/config/env.ts` — add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `.env.example` — add the three new Supabase vars
- `src/common/errors/errors.ts` — add `ConflictError`, `ServiceUnavailableError`
- `package.json` — add `@supabase/supabase-js`

### Unchanged files
- `src/common/guards/auth.guard.ts` — still verifies JWTs via JWKS
- `src/modules/users/users.service.ts` — `upsertFromAuth` already handles the pattern
- `src/modules/users/users.repository.ts` — no changes
- `src/database/schema/users.ts` — no migrations needed
