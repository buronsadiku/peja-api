-- Split translatable fields into per-locale columns.
-- English required (NOT NULL). Albanian optional (nullable, falls back to English at read time).


-- ── activity_templates: name + description ───────────────────
ALTER TABLE "activity_templates" ADD COLUMN IF NOT EXISTS "name_en" text;
ALTER TABLE "activity_templates" ADD COLUMN IF NOT EXISTS "name_sq" text;
UPDATE "activity_templates" SET "name_en" = COALESCE("name_en", "name");
ALTER TABLE "activity_templates" ALTER COLUMN "name_en" SET NOT NULL;
ALTER TABLE "activity_templates" DROP COLUMN IF EXISTS "name";

ALTER TABLE "activity_templates" ADD COLUMN IF NOT EXISTS "description_en" text;
ALTER TABLE "activity_templates" ADD COLUMN IF NOT EXISTS "description_sq" text;
UPDATE "activity_templates" SET "description_en" = COALESCE("description_en", "description");
ALTER TABLE "activity_templates" DROP COLUMN IF EXISTS "description";

-- ── activity_categories: label ───────────────────────────────
ALTER TABLE "activity_categories" ADD COLUMN IF NOT EXISTS "label_en" text;
ALTER TABLE "activity_categories" ADD COLUMN IF NOT EXISTS "label_sq" text;
UPDATE "activity_categories" SET "label_en" = COALESCE("label_en", "label");
ALTER TABLE "activity_categories" ALTER COLUMN "label_en" SET NOT NULL;
ALTER TABLE "activity_categories" DROP COLUMN IF EXISTS "label";

-- ── news_posts: title + body ─────────────────────────────────
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "title_en" text;
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "title_sq" text;
UPDATE "news_posts" SET "title_en" = COALESCE("title_en", "title");
ALTER TABLE "news_posts" ALTER COLUMN "title_en" SET NOT NULL;
ALTER TABLE "news_posts" DROP COLUMN IF EXISTS "title";

ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "body_en" text;
ALTER TABLE "news_posts" ADD COLUMN IF NOT EXISTS "body_sq" text;
UPDATE "news_posts" SET "body_en" = COALESCE("body_en", "body");
ALTER TABLE "news_posts" ALTER COLUMN "body_en" SET NOT NULL;
ALTER TABLE "news_posts" DROP COLUMN IF EXISTS "body";

