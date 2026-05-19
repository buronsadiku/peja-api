-- Manual migration: introduce festival_days table; switch
-- activity_occurrences and registrations from `date` columns to
-- festival_day_id FK references.


-- 1. Create festival_days
CREATE TABLE IF NOT EXISTS "festival_days" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "date" date NOT NULL UNIQUE,
  "label" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_festival_days_date"
  ON "festival_days" ("date");

-- 2. Backfill from existing distinct dates
INSERT INTO "festival_days" ("date")
SELECT date FROM (
  SELECT DISTINCT date FROM "activity_occurrences"
  UNION
  SELECT DISTINCT date FROM "registrations"
) src
ON CONFLICT (date) DO NOTHING;

-- 3. Add FK columns (nullable initially)
ALTER TABLE "activity_occurrences"
  ADD COLUMN IF NOT EXISTS "festival_day_id" uuid REFERENCES "festival_days"("id") ON DELETE RESTRICT;

ALTER TABLE "registrations"
  ADD COLUMN IF NOT EXISTS "festival_day_id" uuid REFERENCES "festival_days"("id") ON DELETE RESTRICT;

-- 4. Backfill FK columns
UPDATE "activity_occurrences" ao
SET "festival_day_id" = fd."id"
FROM "festival_days" fd
WHERE ao."date" = fd."date";

UPDATE "registrations" r
SET "festival_day_id" = fd."id"
FROM "festival_days" fd
WHERE r."date" = fd."date";

-- 5. NOT NULL
ALTER TABLE "activity_occurrences"
  ALTER COLUMN "festival_day_id" SET NOT NULL;

ALTER TABLE "registrations"
  ALTER COLUMN "festival_day_id" SET NOT NULL;

-- 6. Drop old date-based unique constraint, add new one
DROP INDEX IF EXISTS "uniq_registrations_email_date";
DROP INDEX IF EXISTS "idx_registrations_date";
DROP INDEX IF EXISTS "idx_activity_occurrences_date";

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_registrations_email_day"
  ON "registrations" ("email", "festival_day_id");

CREATE INDEX IF NOT EXISTS "idx_registrations_festival_day"
  ON "registrations" ("festival_day_id");

CREATE INDEX IF NOT EXISTS "idx_activity_occurrences_festival_day"
  ON "activity_occurrences" ("festival_day_id");

-- 7. Drop old date columns
ALTER TABLE "activity_occurrences" DROP COLUMN IF EXISTS "date";
ALTER TABLE "registrations" DROP COLUMN IF EXISTS "date";

-- 8. Sort_order: backfill from date order
UPDATE "festival_days" fd
SET "sort_order" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY date) AS rn
  FROM "festival_days"
) sub
WHERE fd."id" = sub."id";

