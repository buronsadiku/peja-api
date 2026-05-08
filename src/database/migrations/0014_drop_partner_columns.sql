-- Backfill any legacy partner_order_id values into vendor_order_ref, then drop legacy columns.

UPDATE "order_items"
SET "vendor_order_ref" = "partner_order_id"
WHERE "vendor_order_ref" IS NULL AND "partner_order_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "partner_order_id";
--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN IF EXISTS "partner_name";
