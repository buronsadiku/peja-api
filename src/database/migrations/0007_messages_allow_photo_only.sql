ALTER TABLE "messages" DROP CONSTRAINT "messages_content_check";--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_content_check" CHECK (audio_key IS NOT NULL OR video_key IS NOT NULL OR photo_key IS NOT NULL OR written_note IS NOT NULL);
