ALTER TABLE "inspections" ADD COLUMN IF NOT EXISTS "reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN IF NOT EXISTS "review_notes" text;