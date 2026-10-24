import {
  boolean,
  integer,
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
  contentType: varchar("content_type", { length: 128 }).notNull(),
  byteSize: integer("byte_size").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BoreholeRecord = typeof boreholeRecords.$inferSelect;
export type Application = typeof applications.$inferSelect;
