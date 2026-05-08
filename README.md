# peja-api

NestJS HTTP API for Peja. Talks to Postgres (Drizzle), Redis (BullMQ
+ ioredis cache), and S3-compatible object storage. The `peja-web`
Next.js app is the only client; auth happens there via Better Auth, and
this API validates the resulting session cookie.

## Architecture in one paragraph

The browser holds a Better Auth session cookie set by `peja-web`.
Cross-subdomain config makes that cookie reach `api.peja.app`. On
each request, `AuthGuard` reads the cookie, verifies the HMAC against
`AUTH_COOKIE_SECRET`, looks up the session row, and attaches the user
to `req.currentUser`. State-changing requests must include
`X-CSRF-Token` matching `session.csrf_token`. There is no JWT, no proxy,
no Supabase.

## Stack

- NestJS 11 (Node 20+)
- Drizzle ORM + Postgres 16
- BullMQ + ioredis (Redis 7)
- AWS SDK v3 client for any S3-compatible store
- nestjs-pino, nestjs-zod, @nestjs/swagger
- pnpm 10

## Local development

Requires Docker for Postgres + Redis + MinIO. Everything else runs on
the host.

```bash
# 1. Boot infra (postgres, redis, minio + bucket bootstrap)
docker compose up -d

# 2. Configure env
cp .env.example .env
# generate secrets:
echo "AUTH_COOKIE_SECRET=$(openssl rand -base64 48)" >> .env
echo "AUTH_HASH_PEPPER=$(openssl rand -base64 48)" >> .env
# AUTH_COOKIE_SECRET must match the same value in peja-web/.env.local

# 3. Install + run
pnpm install
pnpm start:dev
```

API on `http://localhost:3001`. Swagger UI at `/docs` (dev only).
**Migrations apply automatically on every boot** — no `pnpm db:migrate`
step needed in normal use. A Postgres advisory lock prevents concurrent
instances from racing. Set `AUTO_MIGRATE=false` to opt out (for
release-phase migration in CI). `pnpm db:migrate` stays as a manual
escape hatch.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm start:dev` | Watch-mode dev server |
| `pnpm db:generate` | Generate a new Drizzle migration from schema diff |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm ts-check` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Jest |
| `docker compose logs -f postgres` | Tail Postgres |
| `docker compose down -v` | Wipe volumes (fresh DB) |

## Project layout

```
src/
├── common/            # guards, interceptors, errors, i18n, types
│   ├── guards/        # AuthGuard, FreshAuthGuard, EventOwnerGuard
│   ├── i18n/          # backend translations (en/fr/nl/de/es/it)
│   └── errors/        # AppError + GlobalExceptionFilter (i18n-aware)
├── config/            # env validation (zod)
├── database/
│   ├── schema/        # Drizzle table definitions
│   └── migrations/    # generated SQL + meta
├── modules/
│   ├── auth/          # /me CRUD, CSRF, audit log, session refresh queue
│   ├── events/        # event lifecycle, QR, cover upload
│   ├── messages/      # guest messages, retranscribe
│   ├── public/        # unauthenticated guest endpoints
│   ├── payments/      # Stripe checkout + webhook
│   ├── orders/        # order detail + refund
│   ├── keepsakes/     # catalog + preview job dispatch
│   ├── transcription/ # Whisper worker
│   ├── email/         # Resend wrapper, locale-aware templates
│   ├── queue/         # BullMQ root config
│   └── webhooks/      # Stripe webhook handler
└── main.ts
```

## Env

The full list is in `.env.example`. Two secrets that must be correct:

- **`AUTH_COOKIE_SECRET`** — must equal `peja-web`'s
  `AUTH_COOKIE_SECRET`. Better Auth signs cookies with it; this API
  verifies. Rotation invalidates every session.
- **`AUTH_HASH_PEPPER`** — HMAC pepper for the IP/UA hashes stored on
  the `session` row. Independent of the cookie secret.

Database, Redis, S3, Stripe, Resend, OpenAI keys are all standard.

## Deploy (Railway)

- Add the **Postgres** plugin → reference as `${{ Postgres.DATABASE_URL }}`
- Add the **Redis** plugin → reference as `${{ Redis.REDIS_URL }}`
- Set the same `AUTH_*` secrets as the web service
- Set `COOKIE_DOMAIN=.peja.app` on the web service so the session
  cookie reaches `api.peja.app`
- Migrations run automatically on every container start; for stricter
  release-phase control set `AUTO_MIGRATE=false` and add a Railway
  "release command" of `pnpm db:migrate`
- Object storage: Cloudflare R2 with the existing `OBJECT_STORAGE_*` env
  vars

The API must be reachable at `api.peja.app` (CNAME the Railway-issued
domain). Without that, cross-subdomain cookies do not flow.

## Things to know

- Migrations are append-only — never edit a checked-in migration; add a
  new file. `pnpm db:generate` writes them.
- All authenticated state-changing requests require an
  `X-CSRF-Token` header obtained from `GET /api/v1/auth/csrf`. The
  client wires this automatically.
- Auth cleanup runs every 6 hours: expires sessions, verifications,
  rate-limit rows, and trims `auth_events` older than 180 days.
- Never reach for `jsonwebtoken` or `jwks-rsa` — there are no JWTs in
  this codebase.
