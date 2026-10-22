-- S020: resume tokens are stored only as a SHA-256 hash. Idempotent: safe to run again.
ALTER TABLE "applicants" ADD COLUMN IF NOT EXISTS "resume_token_hash" text;--> statement-breakpoint
-- Backfill from the plaintext column. Same value as the app: sha256 of the UTF-8 token, hex. Tokens held by browsers keep working.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name = 'applicants' AND column_name = 'resume_token'
	) THEN
		EXECUTE 'UPDATE "applicants" SET "resume_token_hash" = encode(sha256(convert_to("resume_token", ''UTF8'')), ''hex'') WHERE "resume_token_hash" IS NULL';
	END IF;
END $$;--> statement-breakpoint
ALTER TABLE "applicants" ALTER COLUMN "resume_token_hash" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "applicants_resume_token_hash_uq" ON "applicants" USING btree ("resume_token_hash");--> statement-breakpoint
ALTER TABLE "applicants" DROP CONSTRAINT IF EXISTS "applicants_resume_token_unique";--> statement-breakpoint
-- Plaintext is gone for good once the hash exists.
ALTER TABLE "applicants" DROP COLUMN IF EXISTS "resume_token";
