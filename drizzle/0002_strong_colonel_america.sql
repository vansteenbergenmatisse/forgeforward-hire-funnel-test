CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admin_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "is_final" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_audit_created_idx" ON "admin_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applicants_first_name_trgm_idx" ON "applicants" USING gin ("first_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applicants_last_name_trgm_idx" ON "applicants" USING gin ("last_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applicants_email_trgm_idx" ON "applicants" USING gin ("email" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "applicants_phone_trgm_idx" ON "applicants" USING gin ("phone_e164" gin_trgm_ops);
--> statement-breakpoint
UPDATE "stages" SET "is_final" = true WHERE lower(trim("name")) IN ('hired', 'rejected');
