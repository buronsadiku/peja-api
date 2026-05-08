-- Keepsakes architecture overhaul: dynamic product catalog, variants,
-- typed customization schemas, vendors with region routing, promotions,
-- credit ledger, and render artifact tracking.

CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sku" text NOT NULL,
  "slug" text NOT NULL,
  "product_type" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "base_price_cents" integer NOT NULL,
  "currency" text DEFAULT 'EUR' NOT NULL,
  "category" text NOT NULL,
  "hero_image_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "lead_time_min_days" integer,
  "lead_time_max_days" integer,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "products_sku_unique" UNIQUE("sku"),
  CONSTRAINT "products_slug_unique" UNIQUE("slug"),
  CONSTRAINT "products_type_chk" CHECK (product_type IN ('gold_book','video_montage','digital_album','audio_vinyl','thank_you_cards','canvas_print')),
  CONSTRAINT "products_category_chk" CHECK (category IN ('printed','digital','physical','gift'))
);
--> statement-breakpoint
CREATE INDEX "idx_products_active_sort" ON "products" USING btree ("is_active","sort_order");
--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category");
--> statement-breakpoint
CREATE INDEX "idx_products_type" ON "products" USING btree ("product_type");
--> statement-breakpoint
CREATE TABLE "product_variants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "sku" text NOT NULL,
  "name" text NOT NULL,
  "price_cents" integer,
  "currency" text DEFAULT 'EUR' NOT NULL,
  "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "idx_product_variants_product" ON "product_variants" USING btree ("product_id","is_active","sort_order");
--> statement-breakpoint
CREATE TABLE "product_customization_schemas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_type" text NOT NULL,
  "schema_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_customization_schemas_product_type_unique" UNIQUE("product_type"),
  CONSTRAINT "product_customization_schemas_type_chk" CHECK (product_type IN ('gold_book','video_montage','digital_album','audio_vinyl','thank_you_cards','canvas_print'))
);
--> statement-breakpoint
CREATE TABLE "vendors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "region" text NOT NULL,
  "api_endpoint" text,
  "api_credentials_ref" text,
  "contact_email" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "vendors_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE INDEX "idx_vendors_active_region" ON "vendors" USING btree ("is_active","region");
--> statement-breakpoint
CREATE TABLE "product_vendors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL,
  "vendor_id" uuid NOT NULL,
  "region" text NOT NULL,
  "vendor_sku" text NOT NULL,
  "cost_cents" integer NOT NULL,
  "lead_time_days" integer,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_vendors" ADD CONSTRAINT "product_vendors_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "product_vendors" ADD CONSTRAINT "product_vendors_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_vendor_region" ON "product_vendors" USING btree ("product_id","vendor_id","region");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_vendor_primary" ON "product_vendors" USING btree ("product_id","region") WHERE is_primary = true;
--> statement-breakpoint
CREATE TABLE "promotions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" text,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "value" integer NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "max_redemptions" integer,
  "redemptions_count" integer DEFAULT 0 NOT NULL,
  "conditions_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "promotions_type_chk" CHECK (type IN ('percentage','fixed_amount','free_shipping','bundle'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_promotions_code" ON "promotions" USING btree ("code") WHERE code IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_promotions_active_window" ON "promotions" USING btree ("is_active","starts_at","ends_at");
--> statement-breakpoint
CREATE TABLE "order_promotions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_id" uuid NOT NULL,
  "promotion_id" uuid NOT NULL,
  "discount_cents" integer NOT NULL,
  "applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_promotions" ADD CONSTRAINT "order_promotions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "order_promotions" ADD CONSTRAINT "order_promotions_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE restrict;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_order_promotion" ON "order_promotions" USING btree ("order_id","promotion_id");
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "order_id" uuid,
  "type" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "balance_after_cents" integer NOT NULL,
  "reason" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "credit_transactions_type_chk" CHECK (type IN ('grant','redeem','refund','expire','adjustment'))
);
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX "idx_credit_tx_event_created" ON "credit_transactions" USING btree ("event_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_credit_tx_user_created" ON "credit_transactions" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_credit_tx_order" ON "credit_transactions" USING btree ("order_id");
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_id" uuid;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_variant_id" uuid;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "vendor_id" uuid;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "vendor_order_ref" text;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX "idx_order_items_product_id" ON "order_items" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX "idx_order_items_vendor_id" ON "order_items" USING btree ("vendor_id");
--> statement-breakpoint
CREATE TABLE "keepsake_renders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "order_item_id" uuid,
  "event_id" uuid NOT NULL,
  "product_type" text NOT NULL,
  "render_type" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "status" text DEFAULT 'queued' NOT NULL,
  "s3_key" text,
  "s3_bucket" text,
  "mime_type" text,
  "size_bytes" bigint,
  "page_count" integer,
  "duration_sec" integer,
  "job_log_id" uuid,
  "input_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "error_message" text,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "keepsake_renders_type_chk" CHECK (product_type IN ('gold_book','video_montage','digital_album','audio_vinyl','thank_you_cards','canvas_print')),
  CONSTRAINT "keepsake_renders_render_type_chk" CHECK (render_type IN ('preview','final')),
  CONSTRAINT "keepsake_renders_status_chk" CHECK (status IN ('queued','rendering','completed','failed'))
);
--> statement-breakpoint
ALTER TABLE "keepsake_renders" ADD CONSTRAINT "keepsake_renders_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "keepsake_renders" ADD CONSTRAINT "keepsake_renders_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "keepsake_renders" ADD CONSTRAINT "keepsake_renders_job_log_id_jobs_log_id_fk" FOREIGN KEY ("job_log_id") REFERENCES "public"."jobs_log"("id") ON DELETE set null;
--> statement-breakpoint
CREATE INDEX "idx_keepsake_renders_item_version" ON "keepsake_renders" USING btree ("order_item_id","version");
--> statement-breakpoint
CREATE INDEX "idx_keepsake_renders_event_type_status" ON "keepsake_renders" USING btree ("event_id","product_type","status");
--> statement-breakpoint
CREATE INDEX "idx_keepsake_renders_worker_poll" ON "keepsake_renders" USING btree ("status","created_at") WHERE status IN ('queued','rendering');
