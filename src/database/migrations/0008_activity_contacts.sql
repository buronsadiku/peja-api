-- Two optional contact phone numbers per activity template.

BEGIN;

ALTER TABLE "activity_templates"
  ADD COLUMN IF NOT EXISTS "contact_phone_1" text,
  ADD COLUMN IF NOT EXISTS "contact_phone_2" text;

COMMIT;
