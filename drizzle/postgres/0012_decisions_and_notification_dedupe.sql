ALTER TABLE "notifications" ADD COLUMN "dedupe_key" varchar(255);--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key");