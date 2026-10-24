CREATE TYPE "public"."data_access_level" AS ENUM('public', 'authenticated', 'restricted');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" varchar(64) NOT NULL,
	"borehole_id" integer,
	"applicant_id" integer NOT NULL,
	"stage" varchar(64) NOT NULL,
	"local_authority_value" varchar(255),
	"completeness_json" text,
	"submitted_at" timestamp with time zone,
	"updated_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer NOT NULL,
	"action" varchar(96) NOT NULL,
	"resource_type" varchar(96) NOT NULL,
	"resource_id" varchar(96) NOT NULL,
	"detail_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "borehole_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_code" varchar(64) NOT NULL,
	"site_name" varchar(255) NOT NULL,
	"district" varchar(160) NOT NULL,
	"purpose" varchar(160) NOT NULL,
	"latitude" varchar(32) NOT NULL,
	"longitude" varchar(32) NOT NULL,
	"operational_status" varchar(64) NOT NULL,
	"application_status" varchar(96) NOT NULL,
	"screening_status" varchar(96) NOT NULL,
	"local_authority_value" varchar(255),
	"created_by" integer NOT NULL,
	"updated_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "borehole_records_record_code_unique" UNIQUE("record_code")
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_key" varchar(96) NOT NULL,
	"name" varchar(255) NOT NULL,
	"purpose" text NOT NULL,
	"access_level" "data_access_level" NOT NULL,
	"reference_only" boolean DEFAULT false NOT NULL,
	"access_status" varchar(255) NOT NULL,
	"metadata_json" text,
	"active" boolean DEFAULT true NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_sources_source_key_unique" UNIQUE("source_key")
);
--> statement-breakpoint
CREATE TABLE "evidence_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(32) NOT NULL,
	"entity_id" integer NOT NULL,
	"storage_key" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"content_type" varchar(128) NOT NULL,
	"byte_size" integer NOT NULL,
	"uploaded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "user_workspace_roles" (
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"assigned_by" integer,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"neon_user_id" varchar(128) NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_neon_user_id_unique" UNIQUE("neon_user_id")
);
--> statement-breakpoint
CREATE TABLE "workflow_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"from_stage" varchar(64),
	"to_stage" varchar(64) NOT NULL,
	"actor_id" integer NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_key" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"permissions_json" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_roles_role_key_unique" UNIQUE("role_key")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"jurisdiction" varchar(128) NOT NULL,
	"coordinating_authority" varchar(255) NOT NULL,
	"local_authority_label" varchar(255) NOT NULL,
	"local_authority_value" varchar(255),
	"public_hosting" varchar(255) NOT NULL,
	"private_hosting" varchar(255) NOT NULL,
	"workflow_json" text NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "workspace_settings" (
	"id", "jurisdiction", "coordinating_authority", "local_authority_label",
	"public_hosting", "private_hosting", "workflow_json"
) VALUES (
	1,
	'Zimbabwe',
	'Zimbabwe National Water Authority (ZINWA)',
	'Relevant local Sub-Catchment Council',
	'Public information site',
	'Authenticated application server and database',
	'{"validationStatus":"pending_authority_validation","stages":[{"key":"draft","label":"Draft","allowedNext":["submitted"]},{"key":"submitted","label":"Submitted","allowedNext":["under_review"]},{"key":"under_review","label":"Under review","allowedNext":["information_requested","inspection","decision_recorded"]},{"key":"information_requested","label":"Information requested","allowedNext":["under_review"]},{"key":"inspection","label":"Inspection","allowedNext":["under_review"]},{"key":"decision_recorded","label":"Decision recorded","allowedNext":["closed"]},{"key":"closed","label":"Closed","allowedNext":[]}]}'
) ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "workspace_roles" ("role_key", "name", "description", "permissions_json") VALUES
	('applicant', 'Applicant / borehole owner', 'Own submissions only.', '["application:create","application:view_own","record:view"]'),
	('inspector', 'Inspector', 'Assigned inspections and field reports.', '["inspection:view_assigned","inspection:submit","record:view"]'),
	('reviewer', 'Reviewing officer', 'Case review, screening review and information requests.', '["record:view","record:create","record:update","application:review","application:transition","screening:review","information:request","layer:view"]'),
	('authority_decider', 'Delegated decision officer', 'May record decisions only within assigned authority scope.', '["record:view","application:review","application:transition","decision:record","layer:view"]'),
	('data_steward', 'Data steward', 'Maintains layer metadata and configured workflow data.', '["layer:view","layer:configure","workflow:configure","audit:view"]'),
	('system_admin', 'System administrator', 'Manages accounts and application configuration; no decision authority by default.', '["user:manage","workflow:configure","layer:configure","audit:view"]'),
	('auditor', 'Auditor / read-only analyst', 'Read-only access to permitted records and audit events.', '["record:view","report:view","audit:view","layer:view"]')
ON CONFLICT ("role_key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "data_sources" ("source_key", "name", "purpose", "access_level", "reference_only", "access_status", "metadata_json") VALUES
	('boreholes_database', 'Boreholes_Database', 'Borehole records and operational attributes.', 'restricted', false, 'Awaiting authorized dataset file and confirmed use terms.', '{"portal":"https://zimgeoportal.org.zw/datasets/boreholes/","status":"not_loaded"}'),
	('main_catchments', 'Main_Catchments', 'Catchment context for review and routing.', 'authenticated', false, 'Awaiting dataset download and metadata verification.', '{"portal":"https://zimgeoportal.org.zw/datasets/main-catchments/","license_claim":"PDDL 1.0; verify against downloaded source","status":"not_loaded"}'),
	('regional_hydrogeological_map', 'Regional hydrogeological map', 'Reference context only; not a decision rule.', 'authenticated', true, 'Awaiting official file and confirmed use terms.', '{"status":"not_loaded","decision_use":false}')
ON CONFLICT ("source_key") DO NOTHING;
--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");