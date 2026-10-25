ALTER TABLE "inspections" ADD COLUMN "reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "review_notes" text;