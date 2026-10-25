CREATE TABLE IF NOT EXISTS "decision_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"outcome" varchar(48) NOT NULL,
	"reason" text NOT NULL,
	"conditions" text,
	"decided_by" integer NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_id" integer
);
