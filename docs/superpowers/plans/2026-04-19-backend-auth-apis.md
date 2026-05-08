# Backend Auth APIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all authentication flows through the backend by wrapping Supabase GoTrue via `@supabase/supabase-js`.

**Architecture:** A new `SupabaseAuthProvider` wraps all Supabase SDK calls. The existing `AuthService` orchestrates the provider + `UsersService` for local user upserts. The `AuthController` exposes 10 new endpoints under `/api/v1/auth/`. The `AuthGuard` remains unchanged — it still verifies JWTs via JWKS.

**Tech Stack:** NestJS, `@supabase/supabase-js`, Zod, Drizzle ORM, Jest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/config/env.ts` | Modify | Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `.env.example` | Modify | Add the three new Supabase vars |
| `src/common/errors/errors.ts` | Modify | Add `ConflictError`, `ServiceUnavailableError` |
| `src/modules/auth/supabase-auth.provider.ts` | Create | Thin wrapper around Supabase JS client |
| `src/modules/auth/auth.schemas.ts` | Modify | Replace with schemas for all 10 endpoints |
| `src/modules/auth/auth.service.ts` | Modify | Orchestrate SupabaseAuthProvider + UsersService |
| `src/modules/auth/auth.controller.ts` | Modify | New route handlers, remove old `callback` |
| `src/modules/auth/auth.module.ts` | Modify | Register SupabaseAuthProvider |
| `src/modules/auth/auth.service.spec.ts` | Create | Unit tests for AuthService |
| `src/modules/auth/auth.controller.spec.ts` | Create | Unit tests for AuthController |
| `package.json` | Modify | Add `@supabase/supabase-js` |

---

### Task 1: Install dependency and update env config

**Files:**
- Modify: `package.json`
- Modify: `src/config/env.ts:22-25`
- Modify: `.env.example:14-17`

- [ ] **Step 1: Install `@supabase/supabase-js`**

Run: `npm install @supabase/supabase-js`

- [ ] **Step 2: Add Supabase env vars to `src/config/env.ts`**

In the `envSchema` object, add after the existing Auth block (after line 25):

```typescript
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
```

- [ ] **Step 3: Update `.env.example`**

Replace the existing `# Auth` section with:

```
# Auth (JWT verification — keep these for the AuthGuard)
AUTH_JWKS_URL=https://your-project.supabase.co/auth/v1/.well-known/jwks.json
AUTH_ISSUER=https://your-project.supabase.co/auth/v1
AUTH_AUDIENCE=authenticated
AUTH_USER_ID_CLAIM=sub

# Supabase (auth provider)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run ts-check`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/config/env.ts .env.example
git commit -m "chore: add @supabase/supabase-js and Supabase env vars"
```

---

### Task 2: Add new error classes

**Files:**
- Modify: `src/common/errors/errors.ts`

- [ ] **Step 1: Add `ConflictError` and `ServiceUnavailableError` to `src/common/errors/errors.ts`**

Add at the end of the file, before the closing:

```typescript
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super('CONFLICT', 409, message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable') {
    super('SERVICE_UNAVAILABLE', 503, message);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run ts-check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/common/errors/errors.ts
git commit -m "feat: add ConflictError and ServiceUnavailableError classes"
```

---

### Task 3: Create SupabaseAuthProvider

**Files:**
- Create: `src/modules/auth/supabase-auth.provider.ts`

- [ ] **Step 1: Create `src/modules/auth/supabase-auth.provider.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  UnauthorizedError,
  ConflictError,
  ServiceUnavailableError,
  RateLimitedError,
} from '../../common/errors/errors.js';
import { getEnv } from '../../config/env.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  authProviderId: string;
  email: string;
  fullName?: string;
}

export interface OAuthUrlResult {
  url: string;
}

@Injectable()
export class SupabaseAuthProvider {
  private readonly logger = new Logger('SupabaseAuthProvider');
  private client: SupabaseClient | null = null;
  private adminClient: SupabaseClient | null = null;

  private getClient(): SupabaseClient {
    if (!this.client) {
      const env = getEnv();
      this.client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    return this.client;
  }

  private getAdminClient(): SupabaseClient {
    if (!this.adminClient) {
      const env = getEnv();
      this.adminClient = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        },
      );
    }
    return this.adminClient;
  }

  async signUp(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser }> {
    const { data, error } = await this.getClient().auth.signUp({
      email,
      password,
    });

    if (error) {
      this.handleSupabaseError(error, 'signUp');
    }

    if (!data.user) {
      throw new ServiceUnavailableError('Auth service returned no user');
    }

    return {
      user: {
        authProviderId: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name as string | undefined,
      },
    };
  }

  async signIn(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { data, error } =
      await this.getClient().auth.signInWithPassword({ email, password });

    if (error) {
      this.handleSupabaseError(error, 'signIn');
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!data.user.email_confirmed_at) {
      throw new UnauthorizedError('Email not verified');
    }

    return {
      user: {
        authProviderId: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name as string | undefined,
      },
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      },
    };
  }

  async sendMagicLink(email: string): Promise<void> {
    const { error } = await this.getClient().auth.signInWithOtp({ email });

    if (error) {
      this.handleSupabaseError(error, 'sendMagicLink');
    }
  }

  async getOAuthUrl(
    provider: 'google' | 'apple',
    redirectTo: string,
  ): Promise<OAuthUrlResult> {
    const { data, error } = await this.getClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });

    if (error) {
      this.handleSupabaseError(error, 'getOAuthUrl');
    }

    if (!data.url) {
      throw new ServiceUnavailableError('Auth service returned no URL');
    }

    return { url: data.url };
  }

  async exchangeCodeForSession(
    code: string,
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { data, error } =
      await this.getClient().auth.exchangeCodeForSession(code);

    if (error) {
      this.handleSupabaseError(error, 'exchangeCodeForSession');
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedError('Invalid or expired code');
    }

    return {
      user: {
        authProviderId: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name as string | undefined,
      },
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      },
    };
  }

  async refreshSession(
    refreshToken: string,
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { data, error } = await this.getClient().auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      this.handleSupabaseError(error, 'refreshSession');
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    return {
      user: {
        authProviderId: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name as string | undefined,
      },
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      },
    };
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } =
      await this.getClient().auth.resetPasswordForEmail(email);

    if (error) {
      this.handleSupabaseError(error, 'sendPasswordResetEmail');
    }
  }

  async resetPassword(
    accessToken: string,
    newPassword: string,
  ): Promise<void> {
    const { error } = await this.getAdminClient().auth.admin.updateUserById(
      (await this.getUserIdFromToken(accessToken)),
      { password: newPassword },
    );

    if (error) {
      this.handleSupabaseError(error, 'resetPassword');
    }
  }

  async verifyEmail(
    tokenHash: string,
    type: 'email' | 'email_change',
  ): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { data, error } = await this.getClient().auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      this.handleSupabaseError(error, 'verifyEmail');
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedError('Invalid or expired verification token');
    }

    return {
      user: {
        authProviderId: data.user.id,
        email: data.user.email!,
        fullName: data.user.user_metadata?.full_name as string | undefined,
      },
      tokens: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      },
    };
  }

  async signOut(userId: string): Promise<void> {
    const { error } =
      await this.getAdminClient().auth.admin.signOut(userId);

    if (error) {
      this.handleSupabaseError(error, 'signOut');
    }
  }

  private async getUserIdFromToken(accessToken: string): Promise<string> {
    const { data, error } =
      await this.getClient().auth.getUser(accessToken);

    if (error || !data.user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    return data.user.id;
  }

  private handleSupabaseError(
    error: { message: string; status?: number },
    context: string,
  ): never {
    this.logger.warn({ error: error.message, context }, 'Supabase auth error');

    const msg = error.message.toLowerCase();

    if (msg.includes('user already registered') || msg.includes('already been registered')) {
      throw new ConflictError('Email already registered');
    }
    if (msg.includes('invalid login credentials') || msg.includes('invalid password')) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (msg.includes('email not confirmed')) {
      throw new UnauthorizedError('Email not verified');
    }
    if (msg.includes('refresh_token') || msg.includes('invalid refresh token')) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    if (error.status === 429) {
      throw new RateLimitedError(60);
    }
    if (error.status && error.status >= 500) {
      throw new ServiceUnavailableError('Auth service unavailable');
    }

    throw new UnauthorizedError(error.message);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run ts-check`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/supabase-auth.provider.ts
git commit -m "feat: add SupabaseAuthProvider wrapping Supabase JS client"
```

---

### Task 4: Update auth schemas

**Files:**
- Modify: `src/modules/auth/auth.schemas.ts`

- [ ] **Step 1: Replace `src/modules/auth/auth.schemas.ts` with all endpoint schemas**

```typescript
import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '../../common/constants.js';

// --- Auth endpoint schemas ---

export const signUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    fullName: z.string().min(1).max(100).optional(),
  })
  .strict();

export type SignUpDto = z.infer<typeof signUpSchema>;

export const signInSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export type SignInDto = z.infer<typeof signInSchema>;

export const magicLinkSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

export type MagicLinkDto = z.infer<typeof magicLinkSchema>;

export const oauthUrlSchema = z
  .object({
    provider: z.enum(['google', 'apple']),
    redirectTo: z.string().url(),
  })
  .strict();

export type OAuthUrlDto = z.infer<typeof oauthUrlSchema>;

export const oauthCallbackSchema = z
  .object({
    code: z.string().min(1),
  })
  .strict();

export type OAuthCallbackDto = z.infer<typeof oauthCallbackSchema>;

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export type RefreshDto = z.infer<typeof refreshSchema>;

export const forgotPasswordSchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    accessToken: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z
  .object({
    tokenHash: z.string().min(1),
    type: z.enum(['email', 'email_change']).default('email'),
  })
  .strict();

export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;

// --- Profile schemas (unchanged) ---

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

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run ts-check`
Expected: May show errors in `auth.controller.ts` since it still imports the old `authCallbackSchema`. That's expected — we fix it in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/auth.schemas.ts
git commit -m "feat: add Zod schemas for all auth endpoints"
```

---

### Task 5: Update AuthService

**Files:**
- Modify: `src/modules/auth/auth.service.ts`

- [ ] **Step 1: Replace `src/modules/auth/auth.service.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import {
  SupabaseAuthProvider,
  AuthTokens,
  AuthUser,
} from './supabase-auth.provider.js';
import type { UserRow } from '../users/users.repository.js';

interface AuthResult {
  user: UserRow;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly supabase: SupabaseAuthProvider,
    private readonly usersService: UsersService,
  ) {}

  async signUp(
    email: string,
    password: string,
    fullName?: string,
  ): Promise<{ message: string }> {
    await this.supabase.signUp(email, password);
    return { message: 'Check your email to verify your account' };
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    const { user: authUser, tokens } = await this.supabase.signIn(
      email,
      password,
    );
    const user = await this.upsertLocalUser(authUser);
    return this.buildAuthResult(user, tokens);
  }

  async sendMagicLink(email: string): Promise<{ message: string }> {
    await this.supabase.sendMagicLink(email);
    return { message: 'Check your email for the magic link' };
  }

  async getOAuthUrl(
    provider: 'google' | 'apple',
    redirectTo: string,
  ): Promise<{ url: string }> {
    const { url } = await this.supabase.getOAuthUrl(provider, redirectTo);
    return { url };
  }

  async handleOAuthCallback(code: string): Promise<AuthResult> {
    const { user: authUser, tokens } =
      await this.supabase.exchangeCodeForSession(code);
    const user = await this.upsertLocalUser(authUser);
    return this.buildAuthResult(user, tokens);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const { user: authUser, tokens } =
      await this.supabase.refreshSession(refreshToken);
    const user = await this.upsertLocalUser(authUser);
    return this.buildAuthResult(user, tokens);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    await this.supabase.sendPasswordResetEmail(email);
    return { message: 'Check your email for the password reset link' };
  }

  async resetPassword(
    accessToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.supabase.resetPassword(accessToken, newPassword);
    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(
    tokenHash: string,
    type: 'email' | 'email_change',
  ): Promise<AuthResult> {
    const { user: authUser, tokens } = await this.supabase.verifyEmail(
      tokenHash,
      type,
    );
    const user = await this.upsertLocalUser(authUser);
    return this.buildAuthResult(user, tokens);
  }

  async signOut(authProviderId: string): Promise<{ message: string }> {
    await this.supabase.signOut(authProviderId);
    return { message: 'Signed out successfully' };
  }

  private async upsertLocalUser(authUser: AuthUser): Promise<UserRow> {
    return this.usersService.upsertFromAuth(
      authUser.authProviderId,
      authUser.email,
      authUser.fullName,
    );
  }

  private buildAuthResult(user: UserRow, tokens: AuthTokens): AuthResult {
    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run ts-check`
Expected: May show errors in `auth.controller.ts` — fixed in next task.

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/auth.service.ts
git commit -m "feat: rewrite AuthService to orchestrate SupabaseAuthProvider"
```

---

### Task 6: Update AuthController

**Files:**
- Modify: `src/modules/auth/auth.controller.ts`

- [ ] **Step 1: Replace `src/modules/auth/auth.controller.ts`**

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import {
  signUpSchema,
  signInSchema,
  magicLinkSchema,
  oauthUrlSchema,
  oauthCallbackSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
} from './auth.schemas.js';
import type {
  SignUpDto,
  SignInDto,
  MagicLinkDto,
  OAuthUrlDto,
  OAuthCallbackDto,
  RefreshDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  UpdateProfileDto,
} from './auth.schemas.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Sign up with email and password' })
  @ApiResponse({ status: 201, description: 'Verification email sent' })
  async signUp(
    @Body(new ZodValidationPipe(signUpSchema)) body: SignUpDto,
  ) {
    const result = await this.authService.signUp(
      body.email,
      body.password,
      body.fullName,
    );
    return { data: result };
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiResponse({ status: 200, description: 'User authenticated' })
  async signIn(
    @Body(new ZodValidationPipe(signInSchema)) body: SignInDto,
  ) {
    const result = await this.authService.signIn(body.email, body.password);
    return { data: result };
  }

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send magic link email' })
  @ApiResponse({ status: 200, description: 'Magic link sent' })
  async magicLink(
    @Body(new ZodValidationPipe(magicLinkSchema)) body: MagicLinkDto,
  ) {
    const result = await this.authService.sendMagicLink(body.email);
    return { data: result };
  }

  @Public()
  @Post('oauth/url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get OAuth redirect URL' })
  @ApiResponse({ status: 200, description: 'OAuth URL returned' })
  async oauthUrl(
    @Body(new ZodValidationPipe(oauthUrlSchema)) body: OAuthUrlDto,
  ) {
    const result = await this.authService.getOAuthUrl(
      body.provider,
      body.redirectTo,
    );
    return { data: result };
  }

  @Public()
  @Post('oauth/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange OAuth code for tokens' })
  @ApiResponse({ status: 200, description: 'User authenticated via OAuth' })
  async oauthCallback(
    @Body(new ZodValidationPipe(oauthCallbackSchema)) body: OAuthCallbackDto,
  ) {
    const result = await this.authService.handleOAuthCallback(body.code);
    return { data: result };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshDto,
  ) {
    const result = await this.authService.refresh(body.refreshToken);
    return { data: result };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordDto,
  ) {
    const result = await this.authService.forgotPassword(body.email);
    return { data: result };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordDto,
  ) {
    const result = await this.authService.resetPassword(
      body.accessToken,
      body.newPassword,
    );
    return { data: result };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailDto,
  ) {
    const result = await this.authService.verifyEmail(
      body.tokenHash,
      body.type,
    );
    return { data: result };
  }

  @Post('signout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out (revoke session)' })
  @ApiResponse({ status: 200, description: 'Signed out' })
  async signOut(
    @CurrentUser() user: { id: string; authProviderId?: string },
  ) {
    const result = await this.authService.signOut(
      (user as Record<string, unknown>)['authProviderId'] as string,
    );
    return { data: result };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  me(@CurrentUser() user: { id: string; email: string; role: string }) {
    return { data: { user } };
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateProfile(userId, body);
    return { data: { user } };
  }

  @Delete('me')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Initiate account deletion (GDPR)' })
  @ApiResponse({ status: 202, description: 'Account deletion initiated' })
  async deleteMe(@CurrentUser('id') userId: string) {
    await this.usersService.softDelete(userId);
    return {
      data: {
        message: 'Account deletion initiated. You have 30 days to cancel.',
      },
    };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run ts-check`
Expected: May show errors about `auth.module.ts` not registering `SupabaseAuthProvider` — fixed in next task.

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/auth.controller.ts
git commit -m "feat: add all auth route handlers to AuthController"
```

---

### Task 7: Update AuthModule

**Files:**
- Modify: `src/modules/auth/auth.module.ts`

- [ ] **Step 1: Replace `src/modules/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SupabaseAuthProvider } from './supabase-auth.provider.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthProvider],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run ts-check`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/modules/auth/auth.module.ts
git commit -m "feat: register SupabaseAuthProvider in AuthModule"
```

---

### Task 8: Write AuthService unit tests

**Files:**
- Create: `src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Create `src/modules/auth/auth.service.spec.ts`**

```typescript
import { AuthService } from './auth.service';
import { SupabaseAuthProvider } from './supabase-auth.provider';
import { UsersService } from '../users/users.service';
import { UnauthorizedError } from '../../common/errors/errors';

describe('AuthService', () => {
  let authService: AuthService;
  let supabase: jest.Mocked<SupabaseAuthProvider>;
  let usersService: jest.Mocked<UsersService>;

  const mockUserRow = {
    id: 'user-uuid',
    email: 'test@example.com',
    authProviderId: 'supabase-uid',
    fullName: 'Test User',
    avatarUrl: null,
    preferredLanguage: 'en',
    emailPreferences: { marketing: false, digest: true, alerts: true },
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: 3600,
  };

  const mockAuthUser = {
    authProviderId: 'supabase-uid',
    email: 'test@example.com',
    fullName: 'Test User',
  };

  beforeEach(() => {
    supabase = {
      signUp: jest.fn(),
      signIn: jest.fn(),
      sendMagicLink: jest.fn(),
      getOAuthUrl: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      refreshSession: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      signOut: jest.fn(),
    } as unknown as jest.Mocked<SupabaseAuthProvider>;

    usersService = {
      upsertFromAuth: jest.fn().mockResolvedValue(mockUserRow),
    } as unknown as jest.Mocked<UsersService>;

    authService = new AuthService(supabase, usersService);
  });

  describe('signUp', () => {
    it('calls supabase signUp and returns message', async () => {
      supabase.signUp.mockResolvedValue({ user: mockAuthUser });

      const result = await authService.signUp(
        'test@example.com',
        'password123',
      );

      expect(supabase.signUp).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(result).toEqual({
        message: 'Check your email to verify your account',
      });
    });
  });

  describe('signIn', () => {
    it('returns user and tokens after upsert', async () => {
      supabase.signIn.mockResolvedValue({
        user: mockAuthUser,
        tokens: mockTokens,
      });

      const result = await authService.signIn(
        'test@example.com',
        'password123',
      );

      expect(usersService.upsertFromAuth).toHaveBeenCalledWith(
        'supabase-uid',
        'test@example.com',
        'Test User',
      );
      expect(result).toEqual({
        user: mockUserRow,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
      });
    });
  });

  describe('sendMagicLink', () => {
    it('calls supabase and returns message', async () => {
      supabase.sendMagicLink.mockResolvedValue();

      const result = await authService.sendMagicLink('test@example.com');

      expect(supabase.sendMagicLink).toHaveBeenCalledWith('test@example.com');
      expect(result).toEqual({
        message: 'Check your email for the magic link',
      });
    });
  });

  describe('getOAuthUrl', () => {
    it('returns OAuth URL from supabase', async () => {
      supabase.getOAuthUrl.mockResolvedValue({
        url: 'https://accounts.google.com/o/oauth2/...',
      });

      const result = await authService.getOAuthUrl(
        'google',
        'https://app.example.com/callback',
      );

      expect(supabase.getOAuthUrl).toHaveBeenCalledWith(
        'google',
        'https://app.example.com/callback',
      );
      expect(result).toEqual({
        url: 'https://accounts.google.com/o/oauth2/...',
      });
    });
  });

  describe('handleOAuthCallback', () => {
    it('exchanges code and upserts user', async () => {
      supabase.exchangeCodeForSession.mockResolvedValue({
        user: mockAuthUser,
        tokens: mockTokens,
      });

      const result = await authService.handleOAuthCallback('auth-code');

      expect(supabase.exchangeCodeForSession).toHaveBeenCalledWith('auth-code');
      expect(usersService.upsertFromAuth).toHaveBeenCalledWith(
        'supabase-uid',
        'test@example.com',
        'Test User',
      );
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('refresh', () => {
    it('refreshes session and upserts user', async () => {
      supabase.refreshSession.mockResolvedValue({
        user: mockAuthUser,
        tokens: mockTokens,
      });

      const result = await authService.refresh('old-refresh-token');

      expect(supabase.refreshSession).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(result.refreshToken).toBe('refresh-token');
    });
  });

  describe('forgotPassword', () => {
    it('sends reset email and returns message', async () => {
      supabase.sendPasswordResetEmail.mockResolvedValue();

      const result = await authService.forgotPassword('test@example.com');

      expect(supabase.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual({
        message: 'Check your email for the password reset link',
      });
    });
  });

  describe('resetPassword', () => {
    it('resets password and returns message', async () => {
      supabase.resetPassword.mockResolvedValue();

      const result = await authService.resetPassword(
        'access-token',
        'new-password',
      );

      expect(supabase.resetPassword).toHaveBeenCalledWith(
        'access-token',
        'new-password',
      );
      expect(result).toEqual({
        message: 'Password has been reset successfully',
      });
    });
  });

  describe('verifyEmail', () => {
    it('verifies email, upserts user, returns tokens', async () => {
      supabase.verifyEmail.mockResolvedValue({
        user: mockAuthUser,
        tokens: mockTokens,
      });

      const result = await authService.verifyEmail('token-hash', 'email');

      expect(supabase.verifyEmail).toHaveBeenCalledWith(
        'token-hash',
        'email',
      );
      expect(usersService.upsertFromAuth).toHaveBeenCalled();
      expect(result.accessToken).toBe('access-token');
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      supabase.signOut.mockResolvedValue();

      const result = await authService.signOut('supabase-uid');

      expect(supabase.signOut).toHaveBeenCalledWith('supabase-uid');
      expect(result).toEqual({ message: 'Signed out successfully' });
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx jest src/modules/auth/auth.service.spec.ts --verbose`
Expected: All 10 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/auth.service.spec.ts
git commit -m "test: add AuthService unit tests"
```

---

### Task 9: Write AuthController unit tests

**Files:**
- Create: `src/modules/auth/auth.controller.spec.ts`

- [ ] **Step 1: Create `src/modules/auth/auth.controller.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

  const mockUserRow = {
    id: 'user-uuid',
    email: 'test@example.com',
    authProviderId: 'supabase-uid',
    fullName: 'Test User',
    avatarUrl: null,
    preferredLanguage: 'en',
    emailPreferences: { marketing: false, digest: true, alerts: true },
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    authService = {
      signUp: jest.fn(),
      signIn: jest.fn(),
      sendMagicLink: jest.fn(),
      getOAuthUrl: jest.fn(),
      handleOAuthCallback: jest.fn(),
      refresh: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      verifyEmail: jest.fn(),
      signOut: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    usersService = {
      updateProfile: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('signUp', () => {
    it('wraps result in data envelope', async () => {
      authService.signUp.mockResolvedValue({
        message: 'Check your email to verify your account',
      });

      const result = await controller.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        data: { message: 'Check your email to verify your account' },
      });
    });
  });

  describe('signIn', () => {
    it('wraps auth result in data envelope', async () => {
      const authResult = {
        user: mockUserRow,
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
      };
      authService.signIn.mockResolvedValue(authResult);

      const result = await controller.signIn({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({ data: authResult });
    });
  });

  describe('oauthUrl', () => {
    it('returns url in data envelope', async () => {
      authService.getOAuthUrl.mockResolvedValue({
        url: 'https://accounts.google.com/...',
      });

      const result = await controller.oauthUrl({
        provider: 'google',
        redirectTo: 'https://app.example.com/callback',
      });

      expect(result).toEqual({
        data: { url: 'https://accounts.google.com/...' },
      });
    });
  });

  describe('oauthCallback', () => {
    it('exchanges code and returns tokens', async () => {
      const authResult = {
        user: mockUserRow,
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
      };
      authService.handleOAuthCallback.mockResolvedValue(authResult);

      const result = await controller.oauthCallback({ code: 'auth-code' });

      expect(result).toEqual({ data: authResult });
    });
  });

  describe('refresh', () => {
    it('refreshes tokens', async () => {
      const authResult = {
        user: mockUserRow,
        accessToken: 'new-at',
        refreshToken: 'new-rt',
        expiresIn: 3600,
      };
      authService.refresh.mockResolvedValue(authResult);

      const result = await controller.refresh({ refreshToken: 'old-rt' });

      expect(result).toEqual({ data: authResult });
    });
  });

  describe('signOut', () => {
    it('signs out and returns message', async () => {
      authService.signOut.mockResolvedValue({
        message: 'Signed out successfully',
      });

      const result = await controller.signOut({
        id: 'user-uuid',
        authProviderId: 'supabase-uid',
      });

      expect(authService.signOut).toHaveBeenCalledWith('supabase-uid');
      expect(result).toEqual({
        data: { message: 'Signed out successfully' },
      });
    });
  });

  describe('me', () => {
    it('returns current user', () => {
      const user = { id: 'user-uuid', email: 'test@example.com', role: 'user' };

      const result = controller.me(user);

      expect(result).toEqual({ data: { user } });
    });
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx jest src/modules/auth/auth.controller.spec.ts --verbose`
Expected: All 7 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth/auth.controller.spec.ts
git commit -m "test: add AuthController unit tests"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run all tests**

Run: `npx jest --verbose`
Expected: All tests pass

- [ ] **Step 2: Run TypeScript check**

Run: `npm run ts-check`
Expected: No errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors or warnings

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit any remaining fixes**

If any fixes were needed in steps 1-4, commit them:

```bash
git add -A
git commit -m "fix: resolve lint/type errors from auth API changes"
```
