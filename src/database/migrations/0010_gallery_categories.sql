-- gallery_categories table
CREATE TABLE IF NOT EXISTS "gallery_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "value" text NOT NULL UNIQUE,
  "label_en" text NOT NULL,
  "label_sq" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

-- Seed defaults (idempotent)
INSERT INTO "gallery_categories" ("value", "label_en", "label_sq", "sort_order") VALUES
  ('live',       'Live',         'Live',         0),
  ('workshops',  'Workshops',    'Punëtori',     1),
  ('adventures', 'Adventures',   'Aventura',     2),
  ('food',       'Food & Wine',  'Ushqim & Verë', 3)
ON CONFLICT ("value") DO NOTHING;

-- Drop default that ties section to enum (if any) then convert enum column to text
ALTER TABLE "gallery_images" ALTER COLUMN "section" DROP DEFAULT;
ALTER TABLE "gallery_images"
  ALTER COLUMN "section" TYPE text USING "section"::text;

-- Drop the now-orphan enum type
DROP TYPE IF EXISTS "gallery_section";
