CREATE TABLE "kiosk_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "capture_audio" boolean NOT NULL DEFAULT true,
  "capture_photo" boolean NOT NULL DEFAULT true,
  "capture_video" boolean NOT NULL DEFAULT false,
  "max_duration_seconds" integer NOT NULL DEFAULT 60,
  "return_after_seconds" integer NOT NULL DEFAULT 30,
  "fullscreen_lock" boolean NOT NULL DEFAULT true,
  "guided_mode" boolean NOT NULL DEFAULT false,
  "exit_pin" text,
  "airplane_mode" boolean NOT NULL DEFAULT true,
  "welcome_note" text,
  "welcome_show_photo" boolean NOT NULL DEFAULT false,
  "welcome_show_language_picker" boolean NOT NULL DEFAULT true,
  "welcome_chime" boolean NOT NULL DEFAULT true,
  "offline_store" boolean NOT NULL DEFAULT true,
  "offline_storage_mb" integer NOT NULL DEFAULT 500,
  "offline_notify" boolean NOT NULL DEFAULT true,
  "default_language" text NOT NULL DEFAULT 'en',
  "supported_languages" text[] NOT NULL DEFAULT ARRAY['en']::text[],
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "kiosk_settings_max_duration_chk" CHECK (max_duration_seconds IN (15, 30, 60, 90, 120, 180)),
  CONSTRAINT "kiosk_settings_return_after_chk" CHECK (return_after_seconds IN (10, 20, 30, 60, 120)),
  CONSTRAINT "kiosk_settings_storage_chk" CHECK (offline_storage_mb BETWEEN 100 AND 5000),
  CONSTRAINT "kiosk_settings_pin_chk" CHECK (exit_pin IS NULL OR exit_pin ~ '^[0-9]{4}$'),
  CONSTRAINT "kiosk_settings_welcome_note_chk" CHECK (welcome_note IS NULL OR length(welcome_note) <= 180)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_kiosk_settings_event_id" ON "kiosk_settings" ("event_id");
--> statement-breakpoint
CREATE INDEX "idx_kiosk_settings_default_language" ON "kiosk_settings" ("default_language");
--> statement-breakpoint
INSERT INTO "kiosk_settings" ("event_id", "default_language", "supported_languages")
SELECT id, default_language, ARRAY[default_language]::text[]
FROM "events"
WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;
