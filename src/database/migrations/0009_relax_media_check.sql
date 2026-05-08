-- Relax media_source_chk: guest rows may have NULL message_id during upload-url phase
-- (message_id gets attached when guest submits the message after S3 upload completes)
ALTER TABLE "media" DROP CONSTRAINT IF EXISTS "media_source_chk";
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_source_chk" CHECK (
  (uploader_type = 'guest')
  OR (uploader_type = 'owner' AND uploader_user_id IS NOT NULL)
);
