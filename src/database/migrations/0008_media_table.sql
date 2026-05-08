-- Create media table
CREATE TABLE "media" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "message_id" uuid,
  "uploader_type" text NOT NULL,
  "uploader_user_id" uuid,
  "type" text NOT NULL,
  "s3_key" text NOT NULL,
  "thumb_key" text,
  "mime_type" text NOT NULL,
  "width" integer,
  "height" integer,
  "duration_sec" integer,
  "size_bytes" bigint,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "media_uploader_type_chk" CHECK (uploader_type IN ('guest','owner')),
  CONSTRAINT "media_type_chk" CHECK (type IN ('photo','video')),
  CONSTRAINT "media_source_chk" CHECK ((uploader_type = 'guest' AND message_id IS NOT NULL) OR (uploader_type = 'owner' AND uploader_user_id IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_uploader_user_id_users_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."users"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX "idx_media_event_feed" ON "media" USING btree ("event_id","deleted_at","created_at") WHERE deleted_at IS NULL;
--> statement-breakpoint
CREATE INDEX "idx_media_message" ON "media" USING btree ("message_id");
--> statement-breakpoint
CREATE INDEX "idx_media_event_type" ON "media" USING btree ("event_id","type","deleted_at");
--> statement-breakpoint
-- Backfill from messages.photo_key
INSERT INTO "media" (id, event_id, message_id, uploader_type, uploader_user_id, type, s3_key, mime_type, width, height, duration_sec, sort_order, created_at)
SELECT
  gen_random_uuid(),
  m.event_id,
  m.id,
  CASE WHEN m.submission_source = 'owner_upload' THEN 'owner' ELSE 'guest' END,
  CASE WHEN m.submission_source = 'owner_upload' THEN e.owner_user_id ELSE NULL END,
  'photo',
  m.photo_key,
  COALESCE(
    CASE
      WHEN m.photo_key ILIKE '%.jpg' OR m.photo_key ILIKE '%.jpeg' THEN 'image/jpeg'
      WHEN m.photo_key ILIKE '%.png' THEN 'image/png'
      WHEN m.photo_key ILIKE '%.webp' THEN 'image/webp'
      WHEN m.photo_key ILIKE '%.heic' THEN 'image/heic'
      ELSE 'image/jpeg'
    END,
    'image/jpeg'
  ),
  m.photo_width,
  m.photo_height,
  NULL,
  0,
  m.created_at
FROM "messages" m
JOIN "events" e ON e.id = m.event_id
WHERE m.photo_key IS NOT NULL;
--> statement-breakpoint
-- Backfill from messages.video_key
INSERT INTO "media" (id, event_id, message_id, uploader_type, uploader_user_id, type, s3_key, mime_type, duration_sec, sort_order, created_at)
SELECT
  gen_random_uuid(),
  m.event_id,
  m.id,
  CASE WHEN m.submission_source = 'owner_upload' THEN 'owner' ELSE 'guest' END,
  CASE WHEN m.submission_source = 'owner_upload' THEN e.owner_user_id ELSE NULL END,
  'video',
  m.video_key,
  COALESCE(m.video_mime_type, 'video/mp4'),
  m.video_duration_sec,
  0,
  m.created_at
FROM "messages" m
JOIN "events" e ON e.id = m.event_id
WHERE m.video_key IS NOT NULL;
--> statement-breakpoint
-- Drop legacy media columns from messages
ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_content_check";
--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "photo_key";
--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "photo_width";
--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "photo_height";
--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "video_key";
--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "video_duration_sec";
--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "video_mime_type";
