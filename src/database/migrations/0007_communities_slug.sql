-- Slug column for /community/<slug> detail routes.

BEGIN;

ALTER TABLE "communities" ADD COLUMN IF NOT EXISTS "slug" text;

UPDATE "communities"
SET "slug" = COALESCE(
  "slug",
  regexp_replace(lower("name"), '[^a-z0-9]+', '-', 'g')
)
WHERE "slug" IS NULL;

-- Disambiguate any duplicate slugs by suffixing the row id fragment
UPDATE "communities" AS c
SET "slug" = c."slug" || '-' || substring(c."id"::text, 1, 6)
WHERE c."id" IN (
  SELECT id FROM (
    SELECT id, slug,
      ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) AS rn
    FROM "communities"
  ) ranked
  WHERE rn > 1
);

ALTER TABLE "communities" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "communities" ADD CONSTRAINT "communities_slug_unique" UNIQUE ("slug");
CREATE INDEX IF NOT EXISTS "idx_communities_slug" ON "communities" ("slug");

COMMIT;
