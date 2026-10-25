ALTER TABLE "applications" ADD COLUMN "decision_outcome" varchar(48);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "decision_conditions" text;--> statement-breakpoint
UPDATE "workspace_roles"
SET "permissions_json" = ("permissions_json"::jsonb || '["inspection:assign"]'::jsonb)::text
WHERE "role_key" = 'reviewer' AND NOT ("permissions_json"::jsonb ? 'inspection:assign');
--> statement-breakpoint
UPDATE "workspace_roles"
SET "permissions_json" = ("permissions_json"::jsonb || '["inspection:view_assigned"]'::jsonb)::text
WHERE "role_key" = 'reviewer' AND NOT ("permissions_json"::jsonb ? 'inspection:view_assigned');
--> statement-breakpoint
UPDATE "workspace_roles"
SET "permissions_json" = ("permissions_json"::jsonb || '["party:view","record:view_all"]'::jsonb)::text
WHERE "role_key" = 'reviewer';
--> statement-breakpoint
UPDATE "workspace_roles"
SET "permissions_json" = ("permissions_json"::jsonb || '["record:view_all"]'::jsonb)::text
WHERE "role_key" = 'auditor';
