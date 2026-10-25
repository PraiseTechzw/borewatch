import {
  boolean,
  integer,
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const dataAccessLevel = pgEnum("data_access_level", ["public", "authenticated", "restricted"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  neonUserId: varchar("neon_user_id", { length: 128 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull(),
  name: text("name"),
  role: userRole("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const workspaceSettings = pgTable("workspace_settings", {
  id: integer("id").primaryKey(),
  jurisdiction: varchar("jurisdiction", { length: 128 }).notNull(),
  coordinatingAuthority: varchar("coordinating_authority", { length: 255 }).notNull(),
  localAuthorityLabel: varchar("local_authority_label", { length: 255 }).notNull(),
  localAuthorityValue: varchar("local_authority_value", { length: 255 }),
  publicHosting: varchar("public_hosting", { length: 255 }).notNull(),
  privateHosting: varchar("private_hosting", { length: 255 }).notNull(),
  workflowJson: text("workflow_json").notNull(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceRoles = pgTable("workspace_roles", {
  id: serial("id").primaryKey(),
  roleKey: varchar("role_key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  permissionsJson: text("permissions_json").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userWorkspaceRoles = pgTable("user_workspace_roles", {
  userId: integer("user_id").notNull(),
  roleId: integer("role_id").notNull(),
  assignedBy: integer("assigned_by"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
});

export const dataSources = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  sourceKey: varchar("source_key", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  purpose: text("purpose").notNull(),
  accessLevel: dataAccessLevel("access_level").notNull(),
  referenceOnly: boolean("reference_only").default(false).notNull(),
  accessStatus: varchar("access_status", { length: 255 }).notNull(),
  metadataJson: text("metadata_json"),
  active: boolean("active").default(true).notNull(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const boreholeRecords = pgTable("borehole_records", {
  id: serial("id").primaryKey(),
  recordCode: varchar("record_code", { length: 64 }).notNull().unique(),
  siteName: varchar("site_name", { length: 255 }).notNull(),
  district: varchar("district", { length: 160 }).notNull(),
  purpose: varchar("purpose", { length: 160 }).notNull(),
  latitude: varchar("latitude", { length: 32 }).notNull(),
  longitude: varchar("longitude", { length: 32 }).notNull(),
  operationalStatus: varchar("operational_status", { length: 64 }).notNull(),
  applicationStatus: varchar("application_status", { length: 96 }).notNull(),
  screeningStatus: varchar("screening_status", { length: 96 }).notNull(),
  localAuthorityValue: varchar("local_authority_value", { length: 255 }),
  partyId: integer("party_id"),
  locationDescription: text("location_description"),
  technicalDetailsJson: text("technical_details_json"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  commissionedAt: timestamp("commissioned_at", { withTimezone: true }),
  decommissionedAt: timestamp("decommissioned_at", { withTimezone: true }),
  decommissionReason: text("decommission_reason"),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 64 }).notNull().unique(),
  boreholeId: integer("borehole_id"),
  applicantId: integer("applicant_id").notNull(),
  stage: varchar("stage", { length: 64 }).notNull(),
  applicationType: varchar("application_type", { length: 96 }).default("borehole_registration").notNull(),
  decisionOutcome: varchar("decision_outcome", { length: 48 }),
  decisionConditions: text("decision_conditions"),
  siteDetailsJson: text("site_details_json"),
  localAuthorityValue: varchar("local_authority_value", { length: 255 }),
  completenessJson: text("completeness_json"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  updatedBy: integer("updated_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workflowEvents = pgTable("workflow_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull(),
  fromStage: varchar("from_stage", { length: 64 }),
  toStage: varchar("to_stage", { length: 64 }).notNull(),
  actorId: integer("actor_id").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").notNull(),
  action: varchar("action", { length: 96 }).notNull(),
  resourceType: varchar("resource_type", { length: 96 }).notNull(),
  resourceId: varchar("resource_id", { length: 96 }).notNull(),
  detailJson: text("detail_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evidenceFiles = pgTable("evidence_files", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type", { length: 32 }).notNull(),
  entityId: integer("entity_id").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  documentType: varchar("document_type", { length: 96 }),
  contentType: varchar("content_type", { length: 128 }).notNull(),
  byteSize: integer("byte_size").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 64 }).notNull().unique(),
  boreholeId: integer("borehole_id").notNull(),
  applicationId: integer("application_id"),
  assignedTo: integer("assigned_to").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  status: varchar("status", { length: 48 }).default("assigned").notNull(),
  checklistJson: text("checklist_json").notNull(),
  coordinatesConfirmed: boolean("coordinates_confirmed").default(false).notNull(),
  observations: text("observations"),
  findings: text("findings"),
  recommendations: text("recommendations"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNotes: text("review_notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const followUpActions = pgTable("follow_up_actions", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull(),
  boreholeId: integer("borehole_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  ownerId: integer("owner_id").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  status: varchar("status", { length: 48 }).default("open").notNull(),
  createdBy: integer("created_by").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const hazardLayers = pgTable("hazard_layers", {
  id: serial("id").primaryKey(),
  layerKey: varchar("layer_key", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  sourceKey: varchar("source_key", { length: 96 }).notNull(),
  version: varchar("version", { length: 96 }).notNull(),
  geometryJson: text("geometry_json").notNull(),
  datasetDate: timestamp("dataset_date", { withTimezone: true }),
  coordinateReferenceSystem: varchar("coordinate_reference_system", { length: 64 }).notNull(),
  coverageJson: text("coverage_json"),
  accuracyNotes: text("accuracy_notes"),
  licenseNotes: text("license_notes"),
  verificationStatus: varchar("verification_status", { length: 64 }).notNull(),
  active: boolean("active").default(false).notNull(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const screeningRules = pgTable("screening_rules", {
  id: serial("id").primaryKey(),
  ruleKey: varchar("rule_key", { length: 96 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  version: varchar("version", { length: 64 }).notNull(),
  jurisdiction: varchar("jurisdiction", { length: 160 }).notNull(),
  hazardType: varchar("hazard_type", { length: 96 }).notNull(),
  conditionJson: text("condition_json").notNull(),
  sourceKey: varchar("source_key", { length: 96 }).notNull(),
  sourceReference: text("source_reference"),
  effectiveAt: timestamp("effective_at", { withTimezone: true }),
  approvedBy: varchar("approved_by", { length: 255 }),
  explanation: text("explanation").notNull(),
  active: boolean("active").default(false).notNull(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("screening_rules_key_version_unique").on(table.ruleKey, table.version)]);

export const screeningResults = pgTable("screening_results", {
  id: serial("id").primaryKey(),
  boreholeId: integer("borehole_id").notNull(),
  ruleKey: varchar("rule_key", { length: 96 }),
  ruleVersion: varchar("rule_version", { length: 64 }),
  sourceKey: varchar("source_key", { length: 96 }),
  sourceVersion: varchar("source_version", { length: 96 }),
  outcome: varchar("outcome", { length: 48 }).notNull(),
  explanation: text("explanation").notNull(),
  measuredValue: varchar("measured_value", { length: 160 }),
  thresholdValue: varchar("threshold_value", { length: 160 }),
  assessedAt: timestamp("assessed_at", { withTimezone: true }).defaultNow().notNull(),
  assessedBy: integer("assessed_by").notNull(),
});

export const responsibleParties = pgTable("responsible_parties", {
  id: serial("id").primaryKey(),
  boreholeId: integer("borehole_id").notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  organization: varchar("organization", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactPhone: varchar("contact_phone", { length: 64 }),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("responsible_parties_borehole_unique").on(table.boreholeId)]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: varchar("type", { length: 48 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  message: text("message").notNull(),
  entityType: varchar("entity_type", { length: 48 }),
  entityId: integer("entity_id"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [index("notifications_user_created_idx").on(table.userId, table.createdAt)]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BoreholeRecord = typeof boreholeRecords.$inferSelect;
export type Application = typeof applications.$inferSelect;
