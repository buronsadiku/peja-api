CREATE TABLE IF NOT EXISTS "gallery_subcategories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "value" text NOT NULL UNIQUE,
  "label_en" text NOT NULL,
  "label_sq" text,
  "category_value" text NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_gallery_subcategories_category" ON "gallery_subcategories" ("category_value");
ALTER TABLE "gallery_images" ADD COLUMN IF NOT EXISTS "year" integer DEFAULT 2026 NOT NULL;
ALTER TABLE "gallery_images" ADD COLUMN IF NOT EXISTS "subcategory" text;
CREATE INDEX IF NOT EXISTS "idx_gallery_images_year" ON "gallery_images" ("year");
