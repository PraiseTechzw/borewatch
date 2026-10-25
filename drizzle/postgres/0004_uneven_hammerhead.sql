CREATE TABLE "responsible_parties" (
	"id" serial PRIMARY KEY NOT NULL,
	"borehole_id" integer NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"organization" varchar(255),
	"contact_email" varchar(320),
	"contact_phone" varchar(64),
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN "party_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "responsible_parties_borehole_unique" ON "responsible_parties" USING btree ("borehole_id");