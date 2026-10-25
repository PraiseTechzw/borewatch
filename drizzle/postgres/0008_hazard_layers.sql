CREATE TABLE IF NOT EXISTS "hazard_layers" (
	"id" serial PRIMARY KEY NOT NULL,
	"layer_key" varchar(96) NOT NULL,
	"name" varchar(255) NOT NULL,
	"source_key" varchar(96) NOT NULL,
	"version" varchar(96) NOT NULL,
	"geometry_json" text NOT NULL,
	"dataset_date" timestamp with time zone,
	"coordinate_reference_system" varchar(64) NOT NULL,
	"coverage_json" text,
	"accuracy_notes" text,
	"license_notes" text,
	"verification_status" varchar(64) NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hazard_layers_layer_key_unique" UNIQUE("layer_key")
);
