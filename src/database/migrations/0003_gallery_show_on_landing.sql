-- Add show_on_landing flag to gallery_images so admin can pick which images
-- appear in the home page "Memories" section.

BEGIN;

ALTER TABLE "gallery_images"
  ADD COLUMN IF NOT EXISTS "show_on_landing" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "idx_gallery_images_show_on_landing"
  ON "gallery_images" ("show_on_landing");

COMMIT;
