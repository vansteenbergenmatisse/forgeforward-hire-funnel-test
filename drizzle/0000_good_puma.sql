CREATE TABLE "applicant_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"type" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"stage_id" uuid,
	"resume_token" text NOT NULL,
	"is_test" boolean DEFAULT false NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone_e164" text NOT NULL,
	"phone_country" text,
	"whatsapp_ok" boolean DEFAULT false NOT NULL,
	"timezone" text NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"consent_text" text NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"funnel_step" text DEFAULT 'form_done' NOT NULL,
	"completed_at" timestamp with time zone,
	"video_key" text,
	"video_mime" text,
	"video_bytes" integer,
	"video_seconds" integer,
	"audio_only" boolean DEFAULT false NOT NULL,
	"retake_used" boolean DEFAULT false NOT NULL,
	"thumb_key" text,
	"video_deleted_at" timestamp with time zone,
	"did_task" boolean DEFAULT false NOT NULL,
	"task_text" text,
	"task_link" text,
	"task_file_key" text,
	"score" integer,
	"notes" text DEFAULT '' NOT NULL,
	"applied_before" boolean DEFAULT false NOT NULL,
	"previous_applicant_id" uuid,
	"booking" jsonb,
	"handoff_token" text,
	"handoff_expires_at" timestamp with time zone,
	"utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"user_agent" text,
	"in_app_browser" boolean DEFAULT false NOT NULL,
	"unread_reply" boolean DEFAULT false NOT NULL,
	"last_stage_change_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applicants_resume_token_unique" UNIQUE("resume_token")
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"r2_key" text NOT NULL,
	"bytes" integer DEFAULT 0 NOT NULL,
	"ok" boolean NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"route" text NOT NULL,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"name" text NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"wa_template_name" text,
	"wa_language" text,
	"wa_variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"applicant_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"mode" text DEFAULT 'link' NOT NULL,
	"template_id" uuid,
	"body" text NOT NULL,
	"provider_message_id" text,
	"status" text NOT NULL,
	"error" text,
	"read_by_matt" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"label" text NOT NULL,
	"help_text" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"cal_link" text DEFAULT '' NOT NULL,
	"video_prompt" text NOT NULL,
	"prep_seconds" integer DEFAULT 60 NOT NULL,
	"max_record_seconds" integer DEFAULT 60 NOT NULL,
	"retakes_allowed" integer DEFAULT 1 NOT NULL,
	"task_enabled" boolean DEFAULT true NOT NULL,
	"task_title" text DEFAULT '' NOT NULL,
	"task_content" jsonb,
	"task_allow_text" boolean DEFAULT true NOT NULL,
	"task_allow_link" boolean DEFAULT true NOT NULL,
	"task_allow_file" boolean DEFAULT false NOT NULL,
	"thank_you_text" text NOT NULL,
	"reply_days" integer DEFAULT 5 NOT NULL,
	"handoff_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT 'gray' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_positive" boolean DEFAULT false NOT NULL,
	"role" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"applicant_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unmatched_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payload" jsonb NOT NULL,
	"attendee_email" text,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applicant_events" ADD CONSTRAINT "applicant_events_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_applicant_id_applicants_id_fk" FOREIGN KEY ("applicant_id") REFERENCES "public"."applicants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_template_id_message_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."message_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_questions" ADD CONSTRAINT "project_questions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applicant_events_applicant_idx" ON "applicant_events" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "applicants_project_idx" ON "applicants" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "applicants_stage_idx" ON "applicants" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "applicants_email_idx" ON "applicants" USING btree ("project_id","email");--> statement-breakpoint
CREATE INDEX "applicants_handoff_idx" ON "applicants" USING btree ("handoff_token");--> statement-breakpoint
CREATE INDEX "message_templates_project_idx" ON "message_templates" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "messages_applicant_idx" ON "messages" USING btree ("applicant_id");--> statement-breakpoint
CREATE INDEX "messages_provider_idx" ON "messages" USING btree ("provider_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "processed_webhooks_uq" ON "processed_webhooks" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "project_questions_project_idx" ON "project_questions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "rate_limit_hits_bucket_idx" ON "rate_limit_hits" USING btree ("bucket","created_at");--> statement-breakpoint
CREATE INDEX "stages_project_idx" ON "stages" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_project_role_uq" ON "stages" USING btree ("project_id","role") WHERE "stages"."role" is not null;