-- Replace fixed activity_category enum with a dynamic activity_categories
-- lookup table so admins can add/edit/remove categories at runtime.

BEGIN;

CREATE TABLE IF NOT EXISTS "activity_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "value" text NOT NULL UNIQUE,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

INSERT INTO "activity_categories" ("value", "label", "sort_order") VALUES
  ('music', 'Music', 0),
  ('adventure', 'Adventure', 1),
  ('workshop', 'Workshops', 2),
  ('cultural', 'Cultural', 3),
  ('food', 'Food & Wine', 4),
  ('wellness', 'Wellness', 5)
ON CONFLICT ("value") DO NOTHING;

ALTER TABLE "activity_templates"
  ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "activity_templates"
  ALTER COLUMN "category" TYPE text USING "category"::text;
ALTER TABLE "activity_templates"
  ALTER COLUMN "category" SET DEFAULT 'workshop';

DROP TYPE IF EXISTS "activity_category";

COMMIT;
