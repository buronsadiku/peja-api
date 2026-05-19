-- Add: activity_images, news_posts, sponsors tables.
-- Extend: activity_occurrences with address + lat/lng.


-- ── activity_images ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "activity_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL REFERENCES "activity_templates"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "alt" text NOT NULL DEFAULT '',
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_cover" boolean NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_activity_images_template"
  ON "activity_images" ("template_id");
CREATE INDEX IF NOT EXISTS "idx_activity_images_sort"
  ON "activity_images" ("sort_order");

-- ── news_posts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "news_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "image_url" text,
  "pinned" boolean NOT NULL DEFAULT false,
  "published_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_news_posts_published"
  ON "news_posts" ("published_at");
CREATE INDEX IF NOT EXISTS "idx_news_posts_pinned"
  ON "news_posts" ("pinned");

-- ── sponsors ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "sponsor_tier" AS ENUM ('gold', 'silver', 'bronze');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "sponsors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "logo_url" text NOT NULL,
  "url" text,
  "tier" "sponsor_tier" NOT NULL DEFAULT 'bronze',
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_sponsors_tier" ON "sponsors" ("tier");
CREATE INDEX IF NOT EXISTS "idx_sponsors_sort" ON "sponsors" ("sort_order");

-- ── activity_occurrences: add address + lat/lng ──────────────
ALTER TABLE "activity_occurrences"
  ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "activity_occurrences"
  ADD COLUMN IF NOT EXISTS "latitude" numeric(10, 7);
ALTER TABLE "activity_occurrences"
  ADD COLUMN IF NOT EXISTS "longitude" numeric(10, 7);

