-- Outdoor Community section: festival's community/partner cards.
-- Bilingual description (en required, sq optional).


CREATE TABLE IF NOT EXISTS "communities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "logo_url" text NOT NULL,
  "description_en" text NOT NULL,
  "description_sq" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_communities_sort" ON "communities" ("sort_order");

