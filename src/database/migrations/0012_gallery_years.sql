CREATE TABLE IF NOT EXISTS "gallery_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gallery_years_year_unique" UNIQUE("year")
);
--> statement-breakpoint
ALTER TABLE "gallery_images" ADD COLUMN IF NOT EXISTS "year" integer DEFAULT 2026 NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gallery_images_year" ON "gallery_images" ("year");
--> statement-breakpoint
INSERT INTO "gallery_years" ("year")
SELECT DISTINCT "year" FROM "gallery_images"
ON CONFLICT ("year") DO NOTHING;
--> statement-breakpoint
INSERT INTO "gallery_years" ("year") VALUES (EXTRACT(YEAR FROM now())::int)
ON CONFLICT ("year") DO NOTHING;
--> statement-breakpoint
DROP TABLE IF EXISTS "gallery_subcategories";
--> statement-breakpoint
ALTER TABLE "gallery_images" DROP COLUMN IF EXISTS "subcategory";
