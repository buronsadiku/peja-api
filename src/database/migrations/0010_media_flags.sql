ALTER TABLE "media" ADD COLUMN "is_favorite" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "is_gold_book_selected" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Inherit flags from parent message for backfilled rows
UPDATE "media" m
SET
  "is_favorite" = msg.is_favorite,
  "is_gold_book_selected" = msg.is_gold_book_selected
FROM "messages" msg
WHERE m.message_id = msg.id;
--> statement-breakpoint
CREATE INDEX "idx_media_event_favorite" ON "media" USING btree ("event_id","is_favorite") WHERE is_favorite = TRUE AND deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "idx_media_event_gold_book" ON "media" USING btree ("event_id","is_gold_book_selected") WHERE is_gold_book_selected = TRUE AND deleted_at IS NULL;
