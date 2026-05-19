-- Lineup musicians per festival day. Bilingual name + description, photo cover.
-- One festival day per musician (ON DELETE RESTRICT to keep history safe).


CREATE TABLE IF NOT EXISTS "musicians" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "festival_day_id" uuid NOT NULL REFERENCES "festival_days"("id") ON DELETE RESTRICT,
  "name_en" text NOT NULL,
  "name_sq" text,
  "description_en" text,
  "description_sq" text,
  "photo_url" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "is_published" boolean NOT NULL DEFAULT true,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_musicians_day" ON "musicians" ("festival_day_id");
CREATE INDEX IF NOT EXISTS "idx_musicians_sort" ON "musicians" ("sort_order");
CREATE INDEX IF NOT EXISTS "idx_musicians_published" ON "musicians" ("is_published");

