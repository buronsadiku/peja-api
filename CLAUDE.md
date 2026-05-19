# peja-api

NestJS backend for the **Peja Outdoor Festival** site. Public, read-only HTTP API consumed by `peja-web` (Next.js). All admin mutations live in `peja-web` route handlers — this service has no admin endpoints.

## Stack

- NestJS 11 (ESM, `module: nodenext`)
- Drizzle ORM + node-postgres
- Postgres 16 (local via docker-compose)
- Pino logging (`pino-pretty` in dev)
- Swagger at `GET /docs` in dev
- Zod env validation (`src/config/env.ts`)

## Routes

All under `/v1`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/activities` | List occurrences. Optional `?festivalDayId=` filter. Returns `seatsTaken`, `seatsLeft`, `coverImageUrl` (joined from `activity_images`) per row. |
| GET | `/activities/festival-days` | List `festival_days` rows for day pickers. |
| GET | `/activities/:slug` | Full template + all images + all occurrences (joined with days). |
| POST | `/registrations` | Create registration. Validates: unique `(email, festival_day_id)`, occurrences all on chosen day, no time overlap among selected, capacity not exceeded. Wraps insert + activity links in a tx. Fires mock email. |
| GET | `/registrations/lookup?email=` | Returns most recent reg's `fullName` + `phone` (autofill on register). |
| GET | `/gallery` | Paginated, optional `?section=` filter. |
| GET | `/news` | Paginated. Hides `expires_at` past + `published_at` future. |
| GET | `/news/:slug` | Single post. |
| GET | `/sponsors` | All sponsors sorted by tier (gold→silver→bronze) then `sortOrder`. |

Response shape: `{ data, ...maybe pagination }`. Errors throw Nest exceptions → JSON `{ code, message, ... }` with 4xx status.

## Database schema (`src/database/schema/`)

```
festival_days            id, date UNIQUE, label, sort_order
activity_templates       id, name, slug UNIQUE, description, category (enum)
activity_occurrences     id, template_id FK, festival_day_id FK,
                         start_time, end_time, capacity,
                         location, meeting_point, address, latitude, longitude
activity_images          id, template_id FK, url, alt, sort_order, is_cover
registrations            id, email, full_name, phone, festival_day_id FK,
                         responsibility_accepted, notify_if_absent, created_at
                         UNIQUE(email, festival_day_id)
registration_activities  id, registration_id FK, occurrence_id FK
                         UNIQUE(registration_id, occurrence_id)
gallery_images           id, url, alt, title, caption, section (enum), sort_order
news_posts               id, slug UNIQUE, title, body, image_url, pinned,
                         published_at, expires_at
sponsors                 id, name, logo_url, url, tier (enum), sort_order
user/session/account/    Better Auth tables (managed by web, read-only here)
verification
```

FK rules:
- `activity_occurrences.template_id` ON DELETE CASCADE
- `activity_occurrences.festival_day_id` ON DELETE RESTRICT
- `registrations.festival_day_id` ON DELETE RESTRICT
- `registration_activities.registration_id` ON DELETE CASCADE
- `registration_activities.occurrence_id` ON DELETE RESTRICT
- `activity_images.template_id` ON DELETE CASCADE

## Module structure

```
src/
  main.ts                  boot + swagger + cors
  app.module.ts            root: Config + Logger + Throttler + Database + features
  config/env.ts            Zod env schema
  database/
    schema/                Drizzle table definitions (one file per table)
    migrations/            SQL files (0000_lucky_prodigy, 0001_festival_days,
                           0002_activity_extras_news_sponsors)
    migrate.ts             Advisory-locked runner used on boot
    database.module.ts     DRIZZLE provider (node-postgres pool)
  modules/
    activities/            activities + festival-days + slug detail
    registrations/         create + lookup
    gallery/               public list (paginated)
    news/                  list + slug detail
    sponsors/              list
    email/                 EmailService (console mock)
  seeds/seed-activities.sql  Sample data
```

## Migrations

⚠️ **Drizzle-kit's TTY prompts can fail on column-rename diffs.** When that happens, write the migration SQL by hand in `src/database/migrations/NNNN_name.sql` and apply via `docker exec -i peja-postgres psql -U peja -d peja < file.sql`. The `meta/_journal.json` only tracks autoclaim migrations; manual ones are dormant in the dir and won't be re-applied because they aren't journaled.

Standard flow:
```bash
pnpm db:generate    # diff schema → new migration
pnpm db:migrate     # apply via Drizzle migrator (used by AUTO_MIGRATE=true on boot too)
pnpm db:studio      # web UI (drizzle.studio)
pnpm db:seed        # psql one-shot from seed-activities.sql
```

## Local dev

```bash
cp .env.example .env
docker-compose up -d            # postgres + minio (+ bootstrap)
pnpm install
pnpm db:migrate                 # if not AUTO_MIGRATE
pnpm start:dev
```

API on `:3001`. Swagger `:3001/docs`.

### Required env

```
DATABASE_URL=postgresql://peja:peja@localhost:5432/peja
FRONTEND_BASE_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
AUTO_MIGRATE=true               # set false if migrations live elsewhere
```

Optional (skip in dev): `OBJECT_STORAGE_*`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `SENTRY_*`, `POSTHOG_*`, OAuth pairs.

### Admin user

Better Auth lives in `peja-web`. To create the first admin (one-time):
```bash
# peja-web must be running on :3000
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@peja.fest","password":"changeme","name":"Admin"}'
```
In production set `NODE_ENV=production` in peja-web env → sign-up endpoint blocks further accounts.

## Conventions

- **Time format**: `HH:MM:SS` Postgres `time` (without tz). DTOs accept `HH:MM` and append `:00`.
- **Date format**: `YYYY-MM-DD` Postgres `date`.
- **Slug**: lowercase, hyphens, regex `^[a-z0-9-]+$`. Required unique on templates and news.
- **Capacity rule**: `taken + 1 > capacity → throw`. Counted inside the create-registration tx (race-safe at the request level; for concurrent writes consider advisory locks per-occurrence if traffic grows).
- **Overlap rule**: strict (`a.end > b.start && b.end > a.start`). No buffer.
- **Categories enum**: workshop / adventure / music / food / wellness / cultural.
- **Gallery sections enum**: live / workshops / adventures / food.
- **Sponsor tiers enum**: gold / silver / bronze.
- **Cookie prefix**: `peja` (Better Auth setting on web side must match).

## Email mock

`EmailService.sendRegistrationConfirmation` logs the rendered email payload to console with pino. Swap with Resend impl when `RESEND_API_KEY` set (same interface, just change implementation).

## Production swap

| Concern | Local | Prod |
|---|---|---|
| Postgres | docker | Neon / Railway / Supabase |
| Object storage | MinIO :9000 (`peja-uploads/public/`) | Cloudflare R2 (set `OBJECT_STORAGE_ENDPOINT`, region `auto`, custom domain or `pub-*.r2.dev`) |
| Email | console | Resend (set `RESEND_API_KEY`, `EMAIL_FROM`) |
| API host | `:3001` | Railway |
| DB migration | `pnpm db:migrate` | `AUTO_MIGRATE=true` on boot OR Railway release step |

Cross-project isolation: prod MUST use different R2 bucket + API token than any other project sharing infra.
