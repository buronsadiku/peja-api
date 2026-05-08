ALTER TABLE "messages" ADD COLUMN "is_gold_book_selected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_messages_event_gold_book" ON "messages" USING btree ("event_id","is_gold_book_selected") WHERE is_gold_book_selected = TRUE;
