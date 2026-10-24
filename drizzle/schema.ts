import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: text("name"),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const authSessions = mysqlTable("auth_sessions", {
  id: int("id").autoincrement().primaryKey(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  userId: int("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
});

export const workspaceSettings = mysqlTable("workspace_settings", {
  id: int("id").primaryKey(),
  jurisdiction: varchar("jurisdiction", { length: 128 }).notNull(),
  coordinatingAuthority: varchar("coordinatingAuthority", { length: 255 }).notNull(),
  localAuthorityLabel: varchar("localAuthorityLabel", { length: 255 }).notNull(),
  localAuthorityValue: varchar("localAuthorityValue", { length: 255 }),
  publicHosting: varchar("publicHosting", { length: 255 }).notNull(),
  privateHosting: varchar("privateHosting", { length: 255 }).notNull(),
  workflowJson: text("workflowJson").notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workspaceRoles = mysqlTable("workspace_roles", {
  id: int("id").autoincrement().primaryKey(),
  roleKey: varchar("roleKey", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  permissionsJson: text("permissionsJson").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const userWorkspaceRoles = mysqlTable("user_workspace_roles", {
  userId: int("userId").notNull(),
  roleId: int("roleId").notNull(),
  assignedBy: int("assignedBy"),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
});

export const dataSources = mysqlTable("data_sources", {
  id: int("id").autoincrement().primaryKey(),
  sourceKey: varchar("sourceKey", { length: 96 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  purpose: text("purpose").notNull(),
  accessLevel: mysqlEnum("accessLevel", ["public", "authenticated", "restricted"]).notNull(),
  referenceOnly: boolean("referenceOnly").default(false).notNull(),
  accessStatus: varchar("accessStatus", { length: 255 }).notNull(),
  metadataJson: text("metadataJson"),
  active: boolean("active").default(true).notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const boreholeRecords = mysqlTable("borehole_records", {
  id: int("id").autoincrement().primaryKey(),
  recordCode: varchar("recordCode", { length: 64 }).notNull().unique(),
  siteName: varchar("siteName", { length: 255 }).notNull(),
  district: varchar("district", { length: 160 }).notNull(),
  purpose: varchar("purpose", { length: 160 }).notNull(),
  latitude: varchar("latitude", { length: 32 }).notNull(),
  longitude: varchar("longitude", { length: 32 }).notNull(),
  operationalStatus: varchar("operationalStatus", { length: 64 }).notNull(),
  applicationStatus: varchar("applicationStatus", { length: 96 }).notNull(),
  screeningStatus: varchar("screeningStatus", { length: 96 }).notNull(),
  localAuthorityValue: varchar("localAuthorityValue", { length: 255 }),
  createdBy: int("createdBy").notNull(),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 64 }).notNull().unique(),
  boreholeId: int("boreholeId"),
  applicantId: int("applicantId").notNull(),
  stage: varchar("stage", { length: 64 }).notNull(),
  localAuthorityValue: varchar("localAuthorityValue", { length: 255 }),
  completenessJson: text("completenessJson"),
  submittedAt: timestamp("submittedAt"),
  updatedBy: int("updatedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workflowEvents = mysqlTable("workflow_events", {
  id: int("id").autoincrement().primaryKey(),
  applicationId: int("applicationId").notNull(),
  fromStage: varchar("fromStage", { length: 64 }),
  toStage: varchar("toStage", { length: 64 }).notNull(),
  actorId: int("actorId").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").notNull(),
  action: varchar("action", { length: 96 }).notNull(),
  resourceType: varchar("resourceType", { length: 96 }).notNull(),
  resourceId: varchar("resourceId", { length: 96 }).notNull(),
  detailJson: text("detailJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BoreholeRecord = typeof boreholeRecords.$inferSelect;
export type Application = typeof applications.$inferSelect;
