-- Seed initial product variants for Canvas, Thank You Cards, Audio Vinyl, Gold Book.

INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'canvas_print_40', '40 × 40 cm', 5900, 'EUR', '{"size":"40x40"}'::jsonb, 10
FROM "products" p WHERE p.sku = 'canvas_print'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'canvas_print_60', '60 × 60 cm', 8900, 'EUR', '{"size":"60x60"}'::jsonb, 20
FROM "products" p WHERE p.sku = 'canvas_print'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'canvas_print_80', '80 × 60 cm', 11900, 'EUR', '{"size":"80x60"}'::jsonb, 30
FROM "products" p WHERE p.sku = 'canvas_print'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'thank_you_cards_25', '25 cards', 2900, 'EUR', '{"quantity":25}'::jsonb, 10
FROM "products" p WHERE p.sku = 'thank_you_cards'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'thank_you_cards_50', '50 cards', 3900, 'EUR', '{"quantity":50}'::jsonb, 20
FROM "products" p WHERE p.sku = 'thank_you_cards'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'thank_you_cards_100', '100 cards', 6900, 'EUR', '{"quantity":100}'::jsonb, 30
FROM "products" p WHERE p.sku = 'thank_you_cards'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'thank_you_cards_150', '150 cards', 9900, 'EUR', '{"quantity":150}'::jsonb, 40
FROM "products" p WHERE p.sku = 'thank_you_cards'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'audio_vinyl_noir', 'Noir sleeve', 14900, 'EUR', '{"sleeve":"noir"}'::jsonb, 10
FROM "products" p WHERE p.sku = 'audio_vinyl'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'audio_vinyl_ivory', 'Ivory sleeve', 14900, 'EUR', '{"sleeve":"ivory"}'::jsonb, 20
FROM "products" p WHERE p.sku = 'audio_vinyl'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'audio_vinyl_kraft', 'Kraft sleeve', 13900, 'EUR', '{"sleeve":"kraft"}'::jsonb, 30
FROM "products" p WHERE p.sku = 'audio_vinyl'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'gold_book_standard', 'Standard 25 × 25 cm', 8900, 'EUR', '{"format":"standard"}'::jsonb, 10
FROM "products" p WHERE p.sku = 'gold_book'
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_variants" (
  "product_id", "sku", "name", "price_cents", "currency", "attributes", "sort_order"
)
SELECT p.id, 'gold_book_large', 'Large 30 × 30 cm', 11900, 'EUR', '{"format":"large"}'::jsonb, 20
FROM "products" p WHERE p.sku = 'gold_book'
ON CONFLICT ("sku") DO NOTHING;
