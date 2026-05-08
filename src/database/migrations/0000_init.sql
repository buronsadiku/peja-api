CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"event_id" uuid,
	"template" text NOT NULL,
	"to_email" text NOT NULL,
	"language" text NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text,
	"status" text NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"partner_a_name" text NOT NULL,
	"partner_b_name" text NOT NULL,
	"wedding_date" date,
	"venue_name" text,
	"venue_city" text,
	"expected_guests" integer,
	"welcome_message" text,
	"theme_color" text DEFAULT '#779FEB' NOT NULL,
	"couple_photo_url" text,
	"plan_tier" text,
	"plan_purchased_at" timestamp with time zone,
	"message_limit" integer,
	"storage_expires_at" timestamp with time zone,
	"keepsake_credit_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"qr_code_url" text,
	"default_language" text DEFAULT 'en' NOT NULL,
	"kiosk_pin_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"recipient" text,
	"opened_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_type" text NOT NULL,
	"resource_id" uuid,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"guest_names" text NOT NULL,
	"audio_key" text,
	"audio_duration_sec" integer,
	"audio_mime_type" text,
	"video_key" text,
	"video_duration_sec" integer,
	"video_mime_type" text,
	"photo_key" text,
	"photo_width" integer,
	"photo_height" integer,
	"written_note" text,
	"transcript" text,
	"transcript_language" text,
	"transcript_status" text DEFAULT 'pending' NOT NULL,
	"transcript_attempts" integer DEFAULT 0 NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"couple_notes" text,
	"audio_trim_start_sec" integer,
	"audio_trim_end_sec" integer,
	"submission_source" text NOT NULL,
	"submission_language" text,
	"client_created_at" timestamp with time zone,
	"synced_at" timestamp with time zone,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "messages_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "messages_content_check" CHECK (audio_key IS NOT NULL OR video_key IS NOT NULL OR written_note IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_sku" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"customization" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fulfillment_status" text DEFAULT 'pending' NOT NULL,
	"partner_name" text,
	"partner_order_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"order_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"tax_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"payment_provider" text,
	"payment_provider_id" text,
	"payment_completed_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"refund_amount_cents" integer,
	"refund_reason" text,
	"shipping_name" text,
	"shipping_address_line1" text,
	"shipping_address_line2" text,
	"shipping_city" text,
	"shipping_postal_code" text,
	"shipping_country" text,
	"shipping_phone" text,
	"tracking_carrier" text,
	"tracking_number" text,
	"tracking_url" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"auth_provider_id" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"preferred_language" text DEFAULT 'en' NOT NULL,
	"email_preferences" jsonb DEFAULT '{"marketing":false,"digest":true,"alerts":true}'::jsonb NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_auth_provider_id_unique" UNIQUE("auth_provider_id")
);
--> statement-breakpoint
CREATE TABLE "webhooks_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_type" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_webhooks_provider_event" UNIQUE("provider","provider_event_id")
);
--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_email_log_user_id" ON "email_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_email_log_event_id" ON "email_log" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_email_log_template" ON "email_log" USING btree ("template");--> statement-breakpoint
CREATE INDEX "idx_events_owner_user_id" ON "events" USING btree ("owner_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_events_slug_active" ON "events" USING btree ("slug") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_events_wedding_date" ON "events" USING btree ("wedding_date");--> statement-breakpoint
CREATE INDEX "idx_events_status" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_invitations_event_id" ON "invitations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_log_type_status" ON "jobs_log" USING btree ("job_type","status");--> statement-breakpoint
CREATE INDEX "idx_jobs_log_resource" ON "jobs_log" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_log_queued_at" ON "jobs_log" USING btree ("queued_at");--> statement-breakpoint
CREATE INDEX "idx_messages_event_id" ON "messages" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_messages_event_created" ON "messages" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_event_favorite" ON "messages" USING btree ("event_id","is_favorite") WHERE is_favorite = TRUE;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_messages_idempotency" ON "messages" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_messages_transcript_status" ON "messages" USING btree ("transcript_status") WHERE transcript_status IN ('pending','processing');--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_orders_event_id" ON "orders" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_orders_user_id" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_orders_payment_provider_id" ON "orders" USING btree ("payment_provider_id");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_users_auth_provider_id" ON "users" USING btree ("auth_provider_id");--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_webhooks_log_received" ON "webhooks_log" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_webhooks_log_unprocessed" ON "webhooks_log" USING btree ("provider","processed_at") WHERE processed_at IS NULL;