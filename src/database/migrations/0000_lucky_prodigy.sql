CREATE TYPE "public"."activity_category" AS ENUM('workshop', 'adventure', 'music', 'food', 'wellness', 'cultural');--> statement-breakpoint
CREATE TYPE "public"."gallery_section" AS ENUM('live', 'workshops', 'adventures', 'food');--> statement-breakpoint
CREATE TABLE "activity_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category" "activity_category" DEFAULT 'workshop' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "activity_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"location" text,
	"meeting_point" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"date" date NOT NULL,
	"responsibility_accepted" boolean NOT NULL,
	"notify_if_absent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"occurrence_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"alt" text NOT NULL,
	"title" text,
	"caption" text,
	"section" "gallery_section" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_occurrences" ADD CONSTRAINT "activity_occurrences_template_id_activity_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."activity_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_activities" ADD CONSTRAINT "registration_activities_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_activities" ADD CONSTRAINT "registration_activities_occurrence_id_activity_occurrences_id_fk" FOREIGN KEY ("occurrence_id") REFERENCES "public"."activity_occurrences"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_templates_slug" ON "activity_templates" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_activity_occurrences_date" ON "activity_occurrences" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_activity_occurrences_template_id" ON "activity_occurrences" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_registrations_email_date" ON "registrations" USING btree ("email","date");--> statement-breakpoint
CREATE INDEX "idx_registrations_email" ON "registrations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_registrations_date" ON "registrations" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_reg_activities_reg_occurrence" ON "registration_activities" USING btree ("registration_id","occurrence_id");--> statement-breakpoint
CREATE INDEX "idx_reg_activities_occurrence" ON "registration_activities" USING btree ("occurrence_id");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_section" ON "gallery_images" USING btree ("section");--> statement-breakpoint
CREATE INDEX "idx_gallery_images_sort" ON "gallery_images" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "idx_account_user_id" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_session_user_id" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_session_token" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_user_email" ON "user" USING btree ("email");