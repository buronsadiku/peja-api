# peja-api

NestJS backend for Peja.

## Stack

- NestJS 11
- Drizzle ORM (Postgres)
- BullMQ (Redis)
- Pino logging
- Zod env validation
- Swagger (`/docs` in dev)

## Local setup

```bash
cp .env.example .env
docker-compose up -d
pnpm install
pnpm db:generate   # generate migrations after editing src/database/schema/
pnpm db:migrate    # apply migrations
pnpm start:dev
```

API runs on `http://localhost:3001`. Swagger at `http://localhost:3001/docs`.

## Scripts

- `pnpm start:dev` — dev server with watch
- `pnpm build` — build to `dist/`
- `pnpm db:generate` — generate Drizzle migration from schema diff
- `pnpm db:migrate` — apply migrations
- `pnpm db:studio` — open Drizzle Studio
- `pnpm lint` — eslint --fix
- `pnpm format` — prettier write
- `pnpm ts-check` — typecheck

## Layout

```
src/
  main.ts              boot + swagger + cors
  app.module.ts        root module
  config/env.ts        zod env schema
  database/            drizzle setup, migrations, schema
  modules/             feature modules (add yours here)
  common/              shared decorators, guards, filters (add as needed)
```
