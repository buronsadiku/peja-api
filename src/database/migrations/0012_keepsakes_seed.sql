-- Seed initial keepsake products from KEEPSAKE_CATALOG and starter
-- customization schemas. Idempotent via ON CONFLICT DO NOTHING.

INSERT INTO "products" (
  "sku", "slug", "product_type", "name", "description",
  "base_price_cents", "currency", "category",
  "sort_order", "lead_time_min_days", "lead_time_max_days"
) VALUES
  ('gold_book',       'gold-book',       'gold_book',       'The Gold Book',     'A beautifully printed hardcover photo book with your guests'' messages, photos, and transcripts.', 8900,  'EUR', 'printed',  10, 14, 21),
  ('video_montage',   'video-montage',   'video_montage',   'Video Montage',     'A cinematic video montage combining your guests'' audio messages with their photos.',             4900,  'EUR', 'digital',  20, 7,  14),
  ('digital_album',   'digital-album',   'digital_album',   'Digital Album',     'A downloadable digital album with all messages and photos.',                                       1900,  'EUR', 'digital',  30, 3,  5),
  ('audio_vinyl',     'audio-vinyl',     'audio_vinyl',     'Audio Vinyl',       'A custom-pressed vinyl record featuring your guests'' audio messages.',                            14900, 'EUR', 'physical', 40, 30, 45),
  ('thank_you_cards', 'thank-you-cards', 'thank_you_cards', 'Thank You Cards',   'Personalized thank you cards featuring photos from your guestbook.',                               3900,  'EUR', 'printed',  50, 10, 14),
  ('canvas_print',    'canvas-print',    'canvas_print',    'Canvas Print',      'A large canvas print featuring a collage of your guests'' photos.',                                5900,  'EUR', 'printed',  60, 10, 14)
ON CONFLICT ("sku") DO NOTHING;
--> statement-breakpoint
INSERT INTO "product_customization_schemas" ("product_type", "schema_json", "version") VALUES
  ('gold_book',       '{"type":"object","properties":{"coverColor":{"enum":["black","ivory","blush"]},"layout":{"enum":["classic","modern","mixed"]},"coverText":{"type":"string","maxLength":120},"includePhotos":{"type":"boolean"},"includeTranscripts":{"type":"boolean"},"messageIds":{"type":"array","items":{"type":"string","format":"uuid"}}},"required":["coverColor","layout"]}'::jsonb, 1),
  ('video_montage',   '{"type":"object","properties":{"style":{"enum":["cinematic","romantic","upbeat"]},"durationSec":{"type":"integer","minimum":60,"maximum":300},"musicTrackId":{"type":"string"},"messageIds":{"type":"array","items":{"type":"string","format":"uuid"}}},"required":["style"]}'::jsonb, 1),
  ('digital_album',   '{"type":"object","properties":{"includeAudio":{"type":"boolean"},"includeTranscripts":{"type":"boolean"}}}'::jsonb, 1),
  ('audio_vinyl',     '{"type":"object","properties":{"sleeveDesignId":{"type":"string"},"includedTrackIds":{"type":"array","items":{"type":"string","format":"uuid"}}},"required":["includedTrackIds"]}'::jsonb, 1),
  ('thank_you_cards', '{"type":"object","properties":{"quantity":{"type":"integer","minimum":10,"maximum":500},"design":{"enum":["minimal","floral","classic"]},"messageText":{"type":"string","maxLength":280}},"required":["quantity","design"]}'::jsonb, 1),
  ('canvas_print',    '{"type":"object","properties":{"size":{"enum":["40x40","60x60","80x60"]},"selectedMediaIds":{"type":"array","items":{"type":"string","format":"uuid"},"minItems":1}},"required":["size","selectedMediaIds"]}'::jsonb, 1)
ON CONFLICT ("product_type") DO NOTHING;
