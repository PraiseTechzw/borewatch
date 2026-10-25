ALTER TABLE "screening_rules" DROP CONSTRAINT IF EXISTS "screening_rules_rule_key_unique";--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN IF NOT EXISTS "commissioned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN IF NOT EXISTS "decommissioned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN IF NOT EXISTS "decommission_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "screening_rules_key_version_unique" ON "screening_rules" USING btree ("rule_key","version");