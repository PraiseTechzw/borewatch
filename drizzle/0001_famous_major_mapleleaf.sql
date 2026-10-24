CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(64) NOT NULL,
	`boreholeId` int,
	`applicantId` int NOT NULL,
	`stage` varchar(64) NOT NULL,
	`localAuthorityValue` varchar(255),
	`completenessJson` text,
	`submittedAt` timestamp,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `applications_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorId` int NOT NULL,
	`action` varchar(96) NOT NULL,
	`resourceType` varchar(96) NOT NULL,
	`resourceId` varchar(96) NOT NULL,
	`detailJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `borehole_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordCode` varchar(64) NOT NULL,
	`siteName` varchar(255) NOT NULL,
	`district` varchar(160) NOT NULL,
	`purpose` varchar(160) NOT NULL,
	`latitude` varchar(32) NOT NULL,
	`longitude` varchar(32) NOT NULL,
	`operationalStatus` varchar(64) NOT NULL,
	`applicationStatus` varchar(96) NOT NULL,
	`screeningStatus` varchar(96) NOT NULL,
	`localAuthorityValue` varchar(255),
	`createdBy` int NOT NULL,
	`updatedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `borehole_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `borehole_records_recordCode_unique` UNIQUE(`recordCode`)
);
--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceKey` varchar(96) NOT NULL,
	`name` varchar(255) NOT NULL,
	`purpose` text NOT NULL,
	`accessLevel` enum('public','authenticated','restricted') NOT NULL,
	`referenceOnly` boolean NOT NULL DEFAULT false,
	`accessStatus` varchar(255) NOT NULL,
	`metadataJson` text,
	`active` boolean NOT NULL DEFAULT true,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_sources_id` PRIMARY KEY(`id`),
	CONSTRAINT `data_sources_sourceKey_unique` UNIQUE(`sourceKey`)
);
--> statement-breakpoint
CREATE TABLE `user_workspace_roles` (
	`userId` int NOT NULL,
	`roleId` int NOT NULL,
	`assignedBy` int,
	`assignedAt` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `workflow_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`fromStage` varchar(64),
	`toStage` varchar(64) NOT NULL,
	`actorId` int NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspace_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roleKey` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text,
	`permissionsJson` text NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `workspace_roles_roleKey_unique` UNIQUE(`roleKey`)
);
--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`id` int NOT NULL,
	`jurisdiction` varchar(128) NOT NULL,
	`coordinatingAuthority` varchar(255) NOT NULL,
	`localAuthorityLabel` varchar(255) NOT NULL,
	`localAuthorityValue` varchar(255),
	`publicHosting` varchar(255) NOT NULL,
	`privateHosting` varchar(255) NOT NULL,
	`workflowJson` text NOT NULL,
	`updatedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspace_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
INSERT INTO `workspace_settings` (`id`, `jurisdiction`, `coordinatingAuthority`, `localAuthorityLabel`, `localAuthorityValue`, `publicHosting`, `privateHosting`, `workflowJson`)
VALUES (1, 'Zimbabwe', 'Zimbabwe National Water Authority (ZINWA)', 'Relevant local Sub-Catchment Council', NULL, 'GitHub Pages', 'Project server and database', '{"stages":[{"key":"draft","label":"Draft","allowedNext":["submitted"]},{"key":"submitted","label":"Submitted","allowedNext":["under_review"]},{"key":"under_review","label":"Under review","allowedNext":["information_requested","inspection","decision_recorded"]},{"key":"information_requested","label":"Information requested","allowedNext":["under_review"]},{"key":"inspection","label":"Inspection","allowedNext":["under_review"]},{"key":"decision_recorded","label":"Decision recorded","allowedNext":["closed"]},{"key":"closed","label":"Closed","allowedNext":[]}]}');
--> statement-breakpoint
INSERT IGNORE INTO `workspace_roles` (`roleKey`, `name`, `description`, `permissionsJson`) VALUES
('applicant', 'Applicant / borehole owner', 'Own submissions only.', '["application:create","application:view_own","record:view"]'),
('inspector', 'Inspector', 'Assigned inspections and field reports.', '["inspection:view_assigned","inspection:submit","record:view"]'),
('reviewer', 'Reviewing officer', 'Case review, screening review and information requests.', '["record:view","record:create","record:update","application:review","application:transition","screening:review","information:request","layer:view"]'),
('authority_decider', 'Delegated decision officer', 'May record decisions only within assigned authority scope.', '["record:view","application:review","application:transition","decision:record","layer:view"]'),
('data_steward', 'Data steward', 'Maintains layer metadata and configured workflow data.', '["layer:view","layer:configure","workflow:configure","audit:view"]'),
('system_admin', 'System administrator', 'Manages accounts and application configuration; no decision authority by default.', '["user:manage","workflow:configure","layer:configure","audit:view"]'),
('auditor', 'Auditor / read-only analyst', 'Read-only access to permitted records and audit events.', '["record:view","report:view","audit:view","layer:view"]');
--> statement-breakpoint
INSERT IGNORE INTO `data_sources` (`sourceKey`, `name`, `purpose`, `accessLevel`, `referenceOnly`, `accessStatus`) VALUES
('boreholes_database', 'Boreholes_Database', 'Borehole records and operational attributes.', 'restricted', false, 'Access/use permission required'),
('main_catchments', 'Main_Catchments', 'Catchment context for review and routing.', 'authenticated', false, 'Access/use permission required'),
('regional_hydrogeological_map', 'Regional hydrogeological map', 'Reference context only; not a decision rule.', 'authenticated', true, 'Reference layer; access/use restrictions apply');
