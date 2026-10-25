ALTER TABLE "screening_rules" DROP CONSTRAINT "screening_rules_rule_key_unique";--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN "commissioned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN "decommissioned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN "decommission_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "screening_rules_key_version_unique" ON "screening_rules" USING btree ("rule_key","version");