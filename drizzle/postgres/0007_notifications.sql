CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(48) NOT NULL,
	"title" varchar(160) NOT NULL,
	"message" text NOT NULL,
	"entity_type" varchar(48),
	"entity_id" integer,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
