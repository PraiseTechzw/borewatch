CREATE TABLE "follow_up_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspection_id" integer NOT NULL,
	"borehole_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"owner_id" integer NOT NULL,
	"due_at" timestamp with time zone,
	"status" varchar(48) DEFAULT 'open' NOT NULL,
	"created_by" integer NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(64) NOT NULL,
	"borehole_id" integer NOT NULL,
	"application_id" integer,
	"assigned_to" integer NOT NULL,
	"due_at" timestamp with time zone,
	"status" varchar(48) DEFAULT 'assigned' NOT NULL,
	"checklist_json" text NOT NULL,
	"coordinates_confirmed" boolean DEFAULT false NOT NULL,
	"observations" text,
	"findings" text,
	"recommendations" text,
	"submitted_at" timestamp with time zone,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inspections_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "screening_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"borehole_id" integer NOT NULL,
	"rule_key" varchar(96),
	"rule_version" varchar(64),
	"source_key" varchar(96),
	"source_version" varchar(96),
	"outcome" varchar(48) NOT NULL,
	"explanation" text NOT NULL,
	"measured_value" varchar(160),
	"threshold_value" varchar(160),
	"assessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assessed_by" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_key" varchar(96) NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(64) NOT NULL,
	"jurisdiction" varchar(160) NOT NULL,
	"hazard_type" varchar(96) NOT NULL,
	"condition_json" text NOT NULL,
	"source_key" varchar(96) NOT NULL,
	"source_reference" text,
	"effective_at" timestamp with time zone,
	"approved_by" varchar(255),
	"explanation" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "screening_rules_rule_key_unique" UNIQUE("rule_key")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "application_type" varchar(96) DEFAULT 'borehole_registration' NOT NULL;--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN "location_description" text;--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN "technical_details_json" text;--> statement-breakpoint
ALTER TABLE "borehole_records" ADD COLUMN "verified_at" timestamp with time zone;