import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import {
  applications,
  auditEvents,
  boreholeRecords,
  dataSources,
  evidenceFiles,
  followUpActions,
  inspections,
  type User,
  userWorkspaceRoles,
  users,
  workflowEvents,
  workspaceRoles,
  workspaceSettings,
  screeningRules,
  screeningResults,
  responsibleParties,
  notifications,
  hazardLayers,
  decisionRecords,
} from "../drizzle/schema";
import { getDb } from "./db";
import { permissionProcedure, protectedProcedure, router } from "./_core/trpc";
import { getUserPermissions } from "./permissions";
import { geoJsonDistanceMeters, parseGeoJson } from "./screeningGeometry";
import { deleteEvidence, getEvidenceUrl, uploadEvidence } from "./storage";
import { TRPCError } from "@trpc/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const coordinate = (min: number, max: number) => z.string().refine((value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}, "Coordinate must be a valid decimal-degree value in range");
const applicationSiteDetails = z.object({ siteName: z.string().trim().min(1).max(255), district: z.string().trim().min(1).max(160), purpose: z.string().trim().min(1).max(160), locationDescription: z.string().trim().max(1000).optional(), latitude: coordinate(-90, 90), longitude: coordinate(-180, 180), responsiblePartyName: z.string().trim().min(1).max(255), responsiblePartyOrganization: z.string().trim().max(255).optional(), contactEmail: z.string().trim().email().max(320).optional(), contactPhone: z.string().trim().max(64).optional() });
const applicationSiteDraft = z.object({ siteName: z.string().trim().max(255).optional(), district: z.string().trim().max(160).optional(), purpose: z.string().trim().max(160).optional(), locationDescription: z.string().trim().max(1000).optional(), latitude: z.string().optional(), longitude: z.string().optional(), responsiblePartyName: z.string().trim().max(255).optional(), responsiblePartyOrganization: z.string().trim().max(255).optional(), contactEmail: z.string().trim().max(320).optional(), contactPhone: z.string().trim().max(64).optional() });
const dbOrThrow = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database is not available; configure DATABASE_URL before using the authenticated application");
  return db;
};
async function audit(actorId: number, action: string, resourceType: string, resourceId: string, detail: unknown) {
  const db = await dbOrThrow();
  await db.insert(auditEvents).values({ actorId, action, resourceType, resourceId, detailJson: JSON.stringify(detail) });
}
async function notifyUser(userId: number, type: string, title: string, message: string, entityType?: string, entityId?: number, dedupeKey?: string) {
  const db = await dbOrThrow();
  const query = db.insert(notifications).values({ userId, type, title, message, entityType, entityId, dedupeKey });
  if (dedupeKey) await query.onConflictDoNothing({ target: notifications.dedupeKey }); else await query;
}
async function notifyPermissionHolders(permission: string, type: string, title: string, message: string, entityType?: string, entityId?: number) {
  const db = await dbOrThrow();
  const candidates = await db.select().from(users);
  const eligible = await Promise.all(candidates.map(async (user) => ({ user, permissions: await getUserPermissions(user) })));
  await Promise.all(eligible.filter(({ permissions }) => permissions.has("*") || permissions.has(permission)).map(({ user }) => notifyUser(user.id, type, title, message, entityType, entityId)));
}
async function getSettings() {
  const db = await dbOrThrow();
  const [settings] = await db.select().from(workspaceSettings).where(eq(workspaceSettings.id, 1)).limit(1);
  if (!settings) throw new Error("Workspace configuration has not been initialized");
  return settings;
}

async function assertEvidenceAccess(user: User, entityType: "borehole" | "application" | "inspection", entityId: number, write: boolean) {
  const db = await dbOrThrow();
  const permissions = await getUserPermissions(user);
  if (entityType === "borehole") {
    const allowed = permissions.has("*") || permissions.has(write ? "record:update" : "record:view");
    if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to access borehole evidence" });
    const [record] = await db.select({ id: boreholeRecords.id, createdBy: boreholeRecords.createdBy }).from(boreholeRecords).where(eq(boreholeRecords.id, entityId)).limit(1);
    if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
    if (!write && !permissions.has("*") && !permissions.has("record:view_all") && record.createdBy !== user.id) {
      const [assignment] = await db.select({ id: inspections.id }).from(inspections).where(and(eq(inspections.boreholeId, entityId), eq(inspections.assignedTo, user.id))).limit(1);
      if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "You are not assigned to this record" });
    }
    return;
  }
  if (entityType === "inspection") {
    const [inspection] = await db.select().from(inspections).where(eq(inspections.id, entityId)).limit(1);
    if (!inspection) throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found" });
    const allowed = permissions.has("*") || permissions.has("inspection:assign") || (inspection.assignedTo === user.id && (!write || permissions.has("inspection:submit")));
    if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to access this inspection evidence" });
    return;
  }
  const [application] = await db.select().from(applications).where(eq(applications.id, entityId)).limit(1);
  if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
  const allowed = permissions.has("*") || permissions.has("application:review") || application.applicantId === user.id;
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to access application evidence" });
}

export const borewatchRouter = router({
  geospatial: router({
    boreholeInventory: permissionProcedure("record:view_all").query(async () => {
      const sourceName = "borehole_database-1758978934.geojson";
      let parsed: { type?: string; features?: Array<{ geometry?: { type?: string; coordinates?: unknown[] }; properties?: Record<string, unknown> }> };
      try { parsed = JSON.parse(await readFile(join(process.cwd(), "data/geospatial", sourceName), "utf8")); }
      catch { throw new TRPCError({ code: "NOT_FOUND", message: "The supplied borehole GeoJSON is missing from data/geospatial" }); }
      if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) throw new TRPCError({ code: "BAD_REQUEST", message: "The supplied borehole GeoJSON is invalid" });
      return parsed.features.flatMap((feature) => {
        const properties = feature.properties ?? {}; const coordinates = feature.geometry?.coordinates ?? [];
        const recordCode = String(properties.natl_bhid ?? properties.national_bhid ?? properties.sadc_bhid ?? "").trim();
        const longitude = Number(properties.long_wgs84 ?? coordinates[0]); const latitude = Number(properties.lat_wgs84 ?? coordinates[1]);
        if (feature.geometry?.type !== "Point" || String(properties.country ?? "").toLowerCase() !== "zimbabwe" || !recordCode || !Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < 25 || longitude > 33.1 || latitude < -22.5 || latitude > -15.5) return [];
        return [{ recordCode, longitude, latitude, datum: String(properties.geod_datum ?? "UNKNOWN"), boreholeType: properties.bh_type ?? null, depthM: properties.bh_depth_m ?? null, yieldLps: properties.yield_l_s ?? null, aquifer: properties.hgm_aqtype ?? null, lithology: properties.hgm_litho ?? null, waterLevelM: properties.swl_m ?? null, conductivityMsM: properties.ec_ms_m ?? null, nitrateMgL: properties.no3_mg_l ?? null, fluorideMgL: properties.f_mg_l ?? null }];
      });
    }),
    catchments: protectedProcedure.query(async () => {
      const path = join(process.cwd(), "data/geospatial/catchments-1761164005/catchments-1761164004.geojson");
      try {
        return await readFile(path, "utf8");
      } catch {
        throw new TRPCError({ code: "NOT_FOUND", message: "The supplied catchment GeoJSON is missing from data/geospatial" });
      }
    }),
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      return db.select().from(notifications).where(eq(notifications.userId, ctx.user!.id)).orderBy(desc(notifications.createdAt)).limit(100);
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [updated] = await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, input.id), eq(notifications.userId, ctx.user!.id))).returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Notification not found" });
      return updated;
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await dbOrThrow();
      await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, ctx.user!.id), isNull(notifications.readAt)));
      return { success: true } as const;
    }),
  }),
  workspace: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const [settings] = await db.select().from(workspaceSettings).where(eq(workspaceSettings.id, 1)).limit(1);
      if (!settings) throw new Error("Workspace configuration has not been initialized");
      const [roles, sources, rules] = await Promise.all([
        db.select().from(workspaceRoles).where(eq(workspaceRoles.active, true)),
        db.select().from(dataSources).where(eq(dataSources.active, true)),
        db.select().from(screeningRules),
      ]);
      const layers = await db.select().from(hazardLayers).orderBy(desc(hazardLayers.updatedAt));
      const permissions = await getUserPermissions(ctx.user!);
      return { settings: { ...settings, workflow: JSON.parse(settings.workflowJson) }, roles, sources, rules, layers: layers.map(({ geometryJson, ...layer }) => ({ ...layer, geometryJson: permissions.has("*") || permissions.has("layer:view") ? geometryJson : null })), permissions: [...permissions] };
    }),
  }),
  boreholes: router({
    importBundledGeoJson: permissionProcedure("record:create").mutation(async ({ ctx }) => {
      const permissions = await getUserPermissions(ctx.user!);
      if (!permissions.has("*") && !permissions.has("record:view_all")) throw new TRPCError({ code: "FORBIDDEN", message: "Bulk borehole imports require all-record access" });
      const sourceName = "borehole_database-1758978934.geojson";
      let parsed: { type?: string; features?: Array<{ type?: string; geometry?: { type?: string; coordinates?: unknown[] }; properties?: Record<string, unknown> }> };
      try { parsed = JSON.parse(await readFile(join(process.cwd(), "data/geospatial", sourceName), "utf8")); }
      catch { throw new TRPCError({ code: "NOT_FOUND", message: "The supplied borehole GeoJSON is missing from data/geospatial" }); }
      if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features) || parsed.features.length > 20000) throw new TRPCError({ code: "BAD_REQUEST", message: "The bundled GeoJSON is not a supported FeatureCollection" });
      const features = parsed.features.flatMap((feature) => {
        const properties = feature.properties ?? {}; const coordinates = feature.geometry?.coordinates ?? [];
        const recordCode = String(properties.natl_bhid ?? properties.national_bhid ?? properties.sadc_bhid ?? "").trim();
        const longitude = Number(properties.long_wgs84 ?? coordinates[0]); const latitude = Number(properties.lat_wgs84 ?? coordinates[1]);
        if (feature.geometry?.type !== "Point" || String(properties.country ?? "").toLowerCase() !== "zimbabwe" || !recordCode || !Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < 25 || longitude > 33.1 || latitude < -22.5 || latitude > -15.5) return [];
        const sourceProperties: Record<string, string | number | boolean | null> = {};
        for (const [key, value] of Object.entries(properties)) if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") sourceProperties[key] = typeof value === "string" ? value.slice(0, 1000) : value;
        return [{ recordCode, latitude: String(latitude), longitude: String(longitude), sourceProperties }];
      });
      if (!features.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No valid Zimbabwe borehole points were found in the bundled dataset" });
      const db = await dbOrThrow(); const unique = new Map(features.map((feature) => [feature.recordCode, feature]));
      const rows = [...unique.values()].map((feature) => ({ recordCode: feature.recordCode, siteName: feature.recordCode, district: "Unassigned (source data)", purpose: "Historical groundwater inventory", locationDescription: "Imported from the supplied GeoJSON; verify site details and coordinate datum before operational use.", technicalDetailsJson: JSON.stringify({ sourceDataset: sourceName, sourceProperties: feature.sourceProperties, coordinateDatum: "UNKNOWN (source metadata)", importStatus: "unverified" }), latitude: feature.latitude, longitude: feature.longitude, operationalStatus: "unverified", applicationStatus: "historical_import", screeningStatus: "unable_to_assess", createdBy: ctx.user!.id, updatedBy: ctx.user!.id }));
      return db.transaction(async (tx) => {
        let inserted = 0;
        for (let offset = 0; offset < rows.length; offset += 500) inserted += (await tx.insert(boreholeRecords).values(rows.slice(offset, offset + 500)).onConflictDoNothing({ target: boreholeRecords.recordCode }).returning({ recordCode: boreholeRecords.recordCode })).length;
        const skipped = parsed.features!.length - inserted;
        await tx.insert(auditEvents).values({ actorId: ctx.user!.id, action: "borehole.geojson_imported", resourceType: "borehole_dataset", resourceId: sourceName, detailJson: JSON.stringify({ received: parsed.features!.length, valid: features.length, unique: rows.length, inserted, skipped, coordinateDatum: "UNKNOWN", operationalStatus: "unverified" }) });
        await tx.update(dataSources).set({ accessStatus: `Imported ${inserted} borehole records from ${sourceName}; source datum unknown, verification pending.`, metadataJson: JSON.stringify({ provider: "User-supplied GeoJSON", datasetName: sourceName, importedAt: new Date().toISOString(), importedBy: ctx.user!.id, recordCount: inserted, verificationStatus: "unverified", coordinateDatum: "UNKNOWN" }), updatedBy: ctx.user!.id, updatedAt: new Date() }).where(eq(dataSources.sourceKey, "boreholes_database"));
        return { received: parsed.features!.length, valid: features.length, inserted, skipped };
      });
    }),
    importGeoJson: permissionProcedure("record:create")
      .input(z.object({
        sourceName: z.string().trim().min(1).max(255),
        features: z.array(z.object({
          recordCode: z.string().trim().min(1).max(64),
          siteName: z.string().trim().min(1).max(255),
          latitude: coordinate(-90, 90),
          longitude: coordinate(-180, 180),
          sourceProperties: z.record(z.string(), z.union([z.string().max(1000), z.number(), z.boolean(), z.null()])).optional(),
        })).min(1).max(20000),
      }))
      .mutation(async ({ ctx, input }) => {
        const permissions = await getUserPermissions(ctx.user!);
        if (!permissions.has("*") && !permissions.has("record:view_all")) throw new TRPCError({ code: "FORBIDDEN", message: "Bulk borehole imports require all-record access" });
        const invalidFeatures = input.features.filter((feature) => {
          const country = String(feature.sourceProperties?.country ?? "").toLowerCase();
          const latitude = Number(feature.latitude); const longitude = Number(feature.longitude);
          return country !== "zimbabwe" || longitude < 25 || longitude > 33.1 || latitude < -22.5 || latitude > -15.5;
        });
        if (invalidFeatures.length) throw new TRPCError({ code: "BAD_REQUEST", message: `${invalidFeatures.length} feature(s) are not Zimbabwe borehole points within the dataset extent` });
        const db = await dbOrThrow();
        const unique = new Map<string, typeof input.features[number]>();
        for (const feature of input.features) if (!unique.has(feature.recordCode)) unique.set(feature.recordCode, feature);
        const rows = [...unique.values()].map((feature) => ({
          recordCode: feature.recordCode,
          siteName: feature.siteName,
          district: "Unassigned (source data)",
          purpose: "Historical groundwater inventory",
          locationDescription: "Imported from a GeoJSON source; verify site details and coordinate datum before operational use.",
          technicalDetailsJson: JSON.stringify({ sourceDataset: input.sourceName, sourceProperties: feature.sourceProperties ?? {}, coordinateDatum: "UNKNOWN (source metadata)", importStatus: "unverified" }),
          latitude: feature.latitude,
          longitude: feature.longitude,
          operationalStatus: "unverified",
          applicationStatus: "historical_import",
          screeningStatus: "unable_to_assess",
          createdBy: ctx.user!.id,
          updatedBy: ctx.user!.id,
        }));
        return db.transaction(async (tx) => {
          let inserted = 0;
          for (let offset = 0; offset < rows.length; offset += 500) {
            const batch = rows.slice(offset, offset + 500);
            const created = await tx.insert(boreholeRecords).values(batch).onConflictDoNothing({ target: boreholeRecords.recordCode }).returning({ recordCode: boreholeRecords.recordCode });
            inserted += created.length;
          }
          const skipped = input.features.length - inserted;
          await tx.insert(auditEvents).values({ actorId: ctx.user!.id, action: "borehole.geojson_imported", resourceType: "borehole_dataset", resourceId: input.sourceName, detailJson: JSON.stringify({ received: input.features.length, unique: rows.length, inserted, skipped, coordinateDatum: "UNKNOWN", operationalStatus: "unverified" }) });
          await tx.update(dataSources).set({ accessStatus: `Imported ${inserted} borehole records from ${input.sourceName}; source datum unknown, verification pending.`, metadataJson: JSON.stringify({ provider: "User-supplied GeoJSON", datasetName: input.sourceName, importedAt: new Date().toISOString(), importedBy: ctx.user!.id, recordCount: inserted, verificationStatus: "unverified", coordinateDatum: "UNKNOWN" }), updatedBy: ctx.user!.id, updatedAt: new Date() }).where(eq(dataSources.sourceKey, "boreholes_database"));
          return { received: input.features.length, inserted, skipped };
        });
      }),
    list: permissionProcedure("record:view").query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const permissions = await getUserPermissions(ctx.user!);
      if (permissions.has("*") || permissions.has("record:view_all")) return db.select().from(boreholeRecords).orderBy(desc(boreholeRecords.updatedAt));
      if (permissions.has("inspection:view_assigned")) {
        const assigned = await db.select({ boreholeId: inspections.boreholeId }).from(inspections).where(eq(inspections.assignedTo, ctx.user!.id));
        const owned = await db.select().from(boreholeRecords).where(eq(boreholeRecords.createdBy, ctx.user!.id));
        const ids = new Set([...assigned.map((item) => item.boreholeId), ...owned.map((item) => item.id)]);
        return ids.size ? db.select().from(boreholeRecords).where(inArray(boreholeRecords.id, [...ids])).orderBy(desc(boreholeRecords.updatedAt)) : [];
      }
      return db.select().from(boreholeRecords).where(eq(boreholeRecords.createdBy, ctx.user!.id)).orderBy(desc(boreholeRecords.updatedAt));
    }),
    create: permissionProcedure("record:create")
      .input(z.object({
        siteName: z.string().trim().min(1).max(255),
        district: z.string().trim().min(1).max(160),
        purpose: z.string().trim().min(1).max(160),
        locationDescription: z.string().trim().max(1000).optional(),
        technicalDetails: z.record(z.string(), z.string().max(500)).optional(),
        responsibleParty: z.object({ displayName: z.string().trim().min(1).max(255), organization: z.string().trim().max(255).optional(), contactEmail: z.string().trim().email().max(320).optional(), contactPhone: z.string().trim().max(64).optional() }).optional(),
        latitude: coordinate(-90, 90),
        longitude: coordinate(-180, 180),
        localAuthorityValue: z.string().trim().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const recordCode = `BW-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
        return db.transaction(async (tx) => {
          await tx.insert(boreholeRecords).values({ recordCode, siteName: input.siteName, district: input.district, purpose: input.purpose, locationDescription: input.locationDescription, technicalDetailsJson: JSON.stringify(input.technicalDetails ?? {}), latitude: input.latitude, longitude: input.longitude, operationalStatus: "unverified", applicationStatus: "draft", screeningStatus: "unable_to_assess", localAuthorityValue: input.localAuthorityValue, createdBy: ctx.user!.id, updatedBy: ctx.user!.id });
          const [record] = await tx.select().from(boreholeRecords).where(eq(boreholeRecords.recordCode, recordCode)).limit(1);
          if (!record) throw new Error("Created record could not be retrieved");
          let partyId: number | null = null;
          if (input.responsibleParty) {
            const [party] = await tx.insert(responsibleParties).values({ boreholeId: record.id, ...input.responsibleParty, createdBy: ctx.user!.id, updatedBy: ctx.user!.id }).returning();
            partyId = party.id;
            await tx.update(boreholeRecords).set({ partyId }).where(eq(boreholeRecords.id, record.id));
          }
          await tx.insert(auditEvents).values({ actorId: ctx.user!.id, action: "record.created", resourceType: "borehole", resourceId: recordCode, detailJson: JSON.stringify({ siteName: input.siteName, district: input.district, purpose: input.purpose, responsiblePartyIncluded: Boolean(input.responsibleParty) }) });
          return { ...record, partyId };
        });
      }),
    update: permissionProcedure("record:update")
      .input(z.object({
        id: z.number().int().positive(),
        siteName: z.string().trim().min(1).max(255).optional(),
        district: z.string().trim().min(1).max(160).optional(),
        purpose: z.string().trim().min(1).max(160).optional(),
        latitude: coordinate(-90, 90).optional(),
        longitude: coordinate(-180, 180).optional(),
        operationalStatus: z.string().trim().min(1).max(64).optional(),
        commissionedAt: z.string().datetime().nullable().optional(),
        decommissionedAt: z.string().datetime().nullable().optional(),
        decommissionReason: z.string().trim().max(2000).nullable().optional(),
        locationDescription: z.string().trim().max(1000).nullable().optional(),
        technicalDetails: z.record(z.string(), z.string().max(500)).optional(),
        localAuthorityValue: z.string().trim().max(255).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const { id, technicalDetails, commissionedAt, decommissionedAt, ...changes } = input;
        const persistedChanges = { ...changes, ...(commissionedAt !== undefined ? { commissionedAt: commissionedAt ? new Date(commissionedAt) : null } : {}), ...(decommissionedAt !== undefined ? { decommissionedAt: decommissionedAt ? new Date(decommissionedAt) : null } : {}), ...(technicalDetails ? { technicalDetailsJson: JSON.stringify(technicalDetails) } : {}) };
        if (input.operationalStatus === "decommissioned" && (!input.decommissionedAt || !input.decommissionReason?.trim())) throw new TRPCError({ code: "BAD_REQUEST", message: "A decommission date and reason are required" });
        const [before] = await db.select().from(boreholeRecords).where(eq(boreholeRecords.id, id)).limit(1);
        if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
        const permissions = await getUserPermissions(ctx.user!);
        if (!permissions.has("*") && !permissions.has("record:view_all") && before.createdBy !== ctx.user!.id) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot update this record" });
        await db.update(boreholeRecords).set({ ...persistedChanges, updatedBy: ctx.user!.id, updatedAt: new Date() }).where(eq(boreholeRecords.id, id));
        const [record] = await db.select().from(boreholeRecords).where(eq(boreholeRecords.id, id)).limit(1);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
        await audit(ctx.user!.id, "record.updated", "borehole", record.recordCode, { before: { siteName: before.siteName, district: before.district, purpose: before.purpose, latitude: before.latitude, longitude: before.longitude, operationalStatus: before.operationalStatus, locationDescription: before.locationDescription, technicalDetailsJson: before.technicalDetailsJson }, after: persistedChanges });
        return record;
      }),
    party: router({
      get: protectedProcedure.input(z.object({ boreholeId: z.number().int().positive() })).query(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [record] = await db.select({ id: boreholeRecords.id, partyId: boreholeRecords.partyId, createdBy: boreholeRecords.createdBy }).from(boreholeRecords).where(eq(boreholeRecords.id, input.boreholeId)).limit(1);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
        const permissions = await getUserPermissions(ctx.user!);
        if (record.createdBy !== ctx.user!.id && !permissions.has("*") && !permissions.has("party:view")) throw new TRPCError({ code: "FORBIDDEN", message: "Responsible-party contact data is restricted" });
        if (!record.partyId) return null;
        const [party] = await db.select().from(responsibleParties).where(eq(responsibleParties.id, record.partyId)).limit(1);
        return party ?? null;
      }),
      update: protectedProcedure.input(z.object({ boreholeId: z.number().int().positive(), displayName: z.string().trim().min(1).max(255), organization: z.string().trim().max(255).nullable(), contactEmail: z.string().trim().email().max(320).nullable(), contactPhone: z.string().trim().max(64).nullable() })).mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [record] = await db.select().from(boreholeRecords).where(eq(boreholeRecords.id, input.boreholeId)).limit(1);
        if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
        const permissions = await getUserPermissions(ctx.user!);
        if (record.createdBy !== ctx.user!.id && !permissions.has("*") && (!permissions.has("record:update") || !permissions.has("record:view_all"))) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot update this responsible party" });
        const values = { displayName: input.displayName, organization: input.organization, contactEmail: input.contactEmail, contactPhone: input.contactPhone, updatedBy: ctx.user!.id, updatedAt: new Date() };
        const [party] = record.partyId ? await db.update(responsibleParties).set(values).where(eq(responsibleParties.id, record.partyId)).returning() : await db.insert(responsibleParties).values({ boreholeId: record.id, ...values, createdBy: ctx.user!.id }).returning();
        if (!record.partyId) await db.update(boreholeRecords).set({ partyId: party.id }).where(eq(boreholeRecords.id, record.id));
        await audit(ctx.user!.id, "responsible_party.updated", "borehole", record.recordCode, { displayName: input.displayName, organization: input.organization, contactChanged: true });
        return party;
      }),
    }),
  }),
  applications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const permissions = await getUserPermissions(ctx.user!);
      if (permissions.has("*") || permissions.has("application:review")) {
        return db.select().from(applications).orderBy(desc(applications.updatedAt));
      }
      return db.select().from(applications).where(eq(applications.applicantId, ctx.user!.id)).orderBy(desc(applications.updatedAt));
    }),
    create: permissionProcedure("application:create")
      .input(z.object({ boreholeId: z.number().int().positive().optional(), applicationType: z.string().trim().min(1).max(96).default("borehole_registration"), localAuthorityValue: z.string().trim().max(255).optional(), completeness: z.record(z.string(), z.boolean()).optional(), siteDetails: applicationSiteDraft.optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        if (input.boreholeId) {
          const [record] = await db.select().from(boreholeRecords).where(eq(boreholeRecords.id, input.boreholeId)).limit(1);
          if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
          const permissions = await getUserPermissions(ctx.user!);
          if (record.createdBy !== ctx.user!.id && !permissions.has("*") && !permissions.has("application:review")) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot link an application to this borehole record" });
        }
        const reference = `APP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
        const application = await db.transaction(async (tx) => {
          const [created] = await tx.insert(applications).values({ reference, boreholeId: input.boreholeId, applicantId: ctx.user!.id, stage: "draft", applicationType: input.applicationType, localAuthorityValue: input.localAuthorityValue, completenessJson: JSON.stringify(input.completeness ?? {}), siteDetailsJson: input.siteDetails ? JSON.stringify(input.siteDetails) : null, updatedBy: ctx.user!.id }).returning();
          await tx.insert(auditEvents).values({ actorId: ctx.user!.id, action: "application.created", resourceType: "application", resourceId: reference, detailJson: JSON.stringify({ applicationType: input.applicationType, boreholeId: input.boreholeId, localAuthorityValue: input.localAuthorityValue, siteDetailsProvided: Boolean(input.siteDetails), checklistKeys: Object.keys(input.completeness ?? {}) }) });
          return created;
        });
        return application;
      }),
    updateDraft: protectedProcedure.input(z.object({ applicationId: z.number().int().positive(), applicationType: z.string().trim().min(1).max(96), completeness: z.record(z.string(), z.boolean()), localAuthorityValue: z.string().trim().max(255).nullable().optional(), siteDetails: applicationSiteDraft.optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [application] = await db.select().from(applications).where(eq(applications.id, input.applicationId)).limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      if (application.applicantId !== ctx.user!.id || application.stage !== "draft") throw new TRPCError({ code: "FORBIDDEN", message: "Only the applicant may update an application draft" });
      const updated = await db.transaction(async (tx) => {
        const [saved] = await tx.update(applications).set({ applicationType: input.applicationType, completenessJson: JSON.stringify(input.completeness), localAuthorityValue: input.localAuthorityValue, siteDetailsJson: input.siteDetails ? JSON.stringify(input.siteDetails) : application.siteDetailsJson, updatedBy: ctx.user!.id, updatedAt: new Date() }).where(eq(applications.id, application.id)).returning();
        await tx.insert(auditEvents).values({ actorId: ctx.user!.id, action: "application.draft_updated", resourceType: "application", resourceId: application.reference, detailJson: JSON.stringify({ applicationType: input.applicationType, localAuthorityValue: input.localAuthorityValue, siteDetailsProvided: Boolean(input.siteDetails), checklistKeys: Object.keys(input.completeness) }) });
        return saved;
      });
      return updated;
    }),
    transition: protectedProcedure
      .input(z.object({ applicationId: z.number().int().positive(), toStage: z.string().trim().min(1).max(64), reason: z.string().trim().max(2000).optional(), decisionOutcome: z.enum(["approved", "rejected", "withdrawn"]).optional(), decisionConditions: z.string().trim().max(4000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [application] = await db.select().from(applications).where(eq(applications.id, input.applicationId)).limit(1);
        if (!application) throw new Error("Application not found");
        const permissions = await getUserPermissions(ctx.user!);
        const applicantSubmission = application.applicantId === ctx.user!.id && ((application.stage === "draft" && input.toStage === "submitted") || (application.stage === "information_requested" && input.toStage === "under_review"));
        if (!applicantSubmission && !permissions.has("*") && !permissions.has("application:transition")) throw new TRPCError({ code: "FORBIDDEN", message: "You do not have permission to transition this application" });
        const settings = await getSettings();
        const workflow = JSON.parse(settings.workflowJson) as { stages: Array<{ key: string; allowedNext: string[] }> };
        const current = workflow.stages.find((stage) => stage.key === application.stage);
        if (!current || !current.allowedNext.includes(input.toStage)) throw new Error("Workflow transition is not configured");
        if (input.toStage === "decision_recorded" && !permissions.has("*") && !permissions.has("decision:record")) throw new TRPCError({ code: "FORBIDDEN", message: "Only a user with decision-recording authority may record a decision" });
        if ((input.toStage === "decision_recorded" || input.toStage === "information_requested" || applicantSubmission && input.toStage === "under_review") && !input.reason?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "A reason is required for this workflow transition" });
        if (input.toStage === "submitted" && application.stage === "draft") {
          if (!application.boreholeId) {
            let siteDetails: z.infer<typeof applicationSiteDetails> | null = null;
            try { siteDetails = application.siteDetailsJson ? applicationSiteDetails.parse(JSON.parse(application.siteDetailsJson)) : null; } catch { siteDetails = null; }
            if (!siteDetails) throw new TRPCError({ code: "BAD_REQUEST", message: "Complete the applicant, site, purpose and coordinate details before submitting this application" });
          }
          let completeness: Record<string, boolean> = {};
          try { completeness = JSON.parse(application.completenessJson ?? "{}") as Record<string, boolean>; } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Application checklist is invalid; save the draft checklist again" }); }
          const required = ["site_plan", "land_authority", "technical_details", "supporting_documents"];
          const missing = required.filter((key) => completeness[key] !== true);
          if (missing.length) throw new TRPCError({ code: "BAD_REQUEST", message: `Complete the supporting document checklist before submission: ${missing.join(", ")}` });
          const attachments = await db.select({ documentType: evidenceFiles.documentType }).from(evidenceFiles).where(and(eq(evidenceFiles.entityType, "application"), eq(evidenceFiles.entityId, application.id)));
          const missingFiles = required.filter((key) => !attachments.some((file) => file.documentType === key));
          if (missingFiles.length) throw new TRPCError({ code: "BAD_REQUEST", message: `Upload the supporting documents checked on the application: ${missingFiles.join(", ")}` });
        }
        if (input.toStage === "decision_recorded" && !input.decisionOutcome) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an outcome for the human decision" });
        const updated = await db.transaction(async (tx) => {
          const [saved] = await tx.update(applications).set({ stage: input.toStage, decisionOutcome: input.toStage === "decision_recorded" ? input.decisionOutcome : application.decisionOutcome, decisionConditions: input.toStage === "decision_recorded" ? input.decisionConditions : application.decisionConditions, updatedBy: ctx.user!.id, submittedAt: input.toStage === "submitted" ? new Date() : application.submittedAt }).where(eq(applications.id, application.id)).returning();
          if (input.toStage === "decision_recorded") await tx.insert(decisionRecords).values({ applicationId: application.id, outcome: input.decisionOutcome!, reason: input.reason!, conditions: input.decisionConditions ?? null, decidedBy: ctx.user!.id });
          await tx.insert(workflowEvents).values({ applicationId: application.id, fromStage: application.stage, toStage: input.toStage, actorId: ctx.user!.id, reason: input.reason });
          await tx.insert(auditEvents).values({ actorId: ctx.user!.id, action: "application.transitioned", resourceType: "application", resourceId: application.reference, detailJson: JSON.stringify(input) });
          return saved;
        });
        if (ctx.user!.id !== application.applicantId) {
          await notifyUser(application.applicantId, "application", "Application status updated", `${application.reference} moved to ${input.toStage.replaceAll("_", " ")}.${input.reason ? ` ${input.reason}` : ""}`, "application", application.id);
        } else if (input.toStage === "submitted" || input.toStage === "under_review") {
          await notifyPermissionHolders("application:review", "application", "Application needs review", `${application.reference} is ready for officer review.`, "application", application.id);
        }
        return updated;
      }),
    history: protectedProcedure.input(z.object({ applicationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [application] = await db.select().from(applications).where(eq(applications.id, input.applicationId)).limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      const permissions = await getUserPermissions(ctx.user!);
      if (application.applicantId !== ctx.user!.id && !permissions.has("*") && !permissions.has("application:review")) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this application history" });
      return db.select().from(workflowEvents).where(eq(workflowEvents.applicationId, input.applicationId)).orderBy(desc(workflowEvents.createdAt));
    }),
    decisions: protectedProcedure.input(z.object({ applicationId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [application] = await db.select().from(applications).where(eq(applications.id, input.applicationId)).limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      const permissions = await getUserPermissions(ctx.user!);
      if (application.applicantId !== ctx.user!.id && !permissions.has("*") && !permissions.has("application:review")) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view decision history" });
      return db.select().from(decisionRecords).where(eq(decisionRecords.applicationId, input.applicationId)).orderBy(desc(decisionRecords.decidedAt));
    }),
    correctDecision: permissionProcedure("decision:record").input(z.object({ applicationId: z.number().int().positive(), outcome: z.enum(["approved", "rejected", "withdrawn"]), reason: z.string().trim().min(1).max(2000), conditions: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [application] = await db.select().from(applications).where(eq(applications.id, input.applicationId)).limit(1);
      if (!application) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
      if (application.stage !== "decision_recorded") throw new TRPCError({ code: "CONFLICT", message: "Only a recorded decision can be corrected" });
      const decision = await db.transaction(async (tx) => {
        const previous = await tx.select().from(decisionRecords).where(eq(decisionRecords.applicationId, application.id)).orderBy(desc(decisionRecords.decidedAt)).limit(1);
        const [saved] = await tx.insert(decisionRecords).values({ applicationId: application.id, outcome: input.outcome, reason: input.reason, conditions: input.conditions ?? null, decidedBy: ctx.user!.id, supersedesId: previous[0]?.id ?? null }).returning();
        await tx.update(applications).set({ decisionOutcome: input.outcome, decisionConditions: input.conditions ?? null, updatedBy: ctx.user!.id, updatedAt: new Date() }).where(eq(applications.id, application.id));
        await tx.insert(auditEvents).values({ actorId: ctx.user!.id, action: "application.decision_corrected", resourceType: "application", resourceId: application.reference, detailJson: JSON.stringify({ supersedesId: previous[0]?.id ?? null, outcome: input.outcome, reason: input.reason }) });
        return saved;
      });
      await notifyUser(application.applicantId, "application", "Application decision corrected", `${application.reference} has a corrected decision. Reason: ${input.reason}`, "application", application.id);
      return decision;
    }),
  }),
  inspections: router({
    assignees: permissionProcedure("inspection:assign").query(async () => {
      const db = await dbOrThrow();
      const allUsers = await db.select().from(users).orderBy(users.email);
      const eligible = await Promise.all(allUsers.map(async (user) => ({ user, permissions: await getUserPermissions(user) })));
      return eligible.filter(({ permissions }) => permissions.has("*") || permissions.has("inspection:submit")).map(({ user }) => ({ id: user.id, name: user.name, email: user.email }));
    }),
    list: permissionProcedure("inspection:view_assigned").query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const permissions = await getUserPermissions(ctx.user!);
      if (permissions.has("*") || permissions.has("inspection:assign")) return db.select().from(inspections).orderBy(desc(inspections.createdAt));
      return db.select().from(inspections).where(eq(inspections.assignedTo, ctx.user!.id)).orderBy(desc(inspections.createdAt));
    }),
    start: protectedProcedure.input(z.object({ inspectionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [inspection] = await db.select().from(inspections).where(eq(inspections.id, input.inspectionId)).limit(1);
      if (!inspection) throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found" });
      const permissions = await getUserPermissions(ctx.user!);
      if (inspection.assignedTo !== ctx.user!.id || !permissions.has("inspection:submit")) throw new TRPCError({ code: "FORBIDDEN", message: "This inspection is not assigned to you" });
      if (inspection.status !== "assigned") throw new TRPCError({ code: "CONFLICT", message: "Only an assigned inspection can be started" });
      const [updated] = await db.update(inspections).set({ status: "in_progress", updatedAt: new Date() }).where(eq(inspections.id, inspection.id)).returning();
      await audit(ctx.user!.id, "inspection.started", "inspection", inspection.reference, { from: inspection.status, to: "in_progress" });
      return updated;
    }),
    create: permissionProcedure("inspection:assign").input(z.object({ boreholeId: z.number().int().positive(), applicationId: z.number().int().positive().optional(), assignedTo: z.number().int().positive(), dueAt: z.string().datetime().optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [record] = await db.select().from(boreholeRecords).where(eq(boreholeRecords.id, input.boreholeId)).limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
      const [inspector] = await db.select().from(users).where(eq(users.id, input.assignedTo)).limit(1);
      if (!inspector) throw new TRPCError({ code: "NOT_FOUND", message: "Assigned user not found" });
      const inspectorPermissions = await getUserPermissions(inspector);
      if (!inspectorPermissions.has("*") && !inspectorPermissions.has("inspection:submit")) throw new TRPCError({ code: "BAD_REQUEST", message: "The assigned user does not have the inspector submission role" });
      const reference = `INSP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      const [created] = await db.insert(inspections).values({ reference, boreholeId: input.boreholeId, applicationId: input.applicationId, assignedTo: input.assignedTo, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, checklistJson: JSON.stringify({ siteIdentityConfirmed: false, accessAndConditionObserved: false, evidenceRecorded: false }), createdBy: ctx.user!.id }).returning();
      await audit(ctx.user!.id, "inspection.assigned", "inspection", reference, input);
      return created;
    }),
    submit: protectedProcedure.input(z.object({ inspectionId: z.number().int().positive(), coordinatesConfirmed: z.literal(true), checklist: z.record(z.string(), z.boolean()), observations: z.string().trim().min(1).max(10000), findings: z.string().trim().min(1).max(10000), recommendations: z.string().trim().max(10000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [inspection] = await db.select().from(inspections).where(eq(inspections.id, input.inspectionId)).limit(1);
      if (!inspection) throw new TRPCError({ code: "NOT_FOUND", message: "Inspection not found" });
      const permissions = await getUserPermissions(ctx.user!);
      if (inspection.assignedTo !== ctx.user!.id || (!permissions.has("*") && !permissions.has("inspection:submit"))) throw new TRPCError({ code: "FORBIDDEN", message: "Only the assigned inspector may submit findings" });
      if (inspection.submittedAt) throw new TRPCError({ code: "CONFLICT", message: "Submitted findings are immutable; create a follow-up inspection to add new findings" });
      if (inspection.status !== "in_progress") throw new TRPCError({ code: "CONFLICT", message: "Start the inspection before submitting findings" });
      const [saved] = await db.update(inspections).set({ status: "submitted", coordinatesConfirmed: true, checklistJson: JSON.stringify(input.checklist), observations: input.observations, findings: input.findings, recommendations: input.recommendations, submittedAt: new Date(), updatedAt: new Date() }).where(eq(inspections.id, inspection.id)).returning();
      await audit(ctx.user!.id, "inspection.submitted", "inspection", inspection.reference, input);
      await notifyPermissionHolders("inspection:assign", "inspection", "Inspection report submitted", `${inspection.reference} is ready for review.`, "inspection", inspection.id);
      return saved;
    }),
    review: permissionProcedure("inspection:assign").input(z.object({ inspectionId: z.number().int().positive(), outcome: z.enum(["reviewed", "follow_up_required"]), notes: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [inspection] = await db.select().from(inspections).where(eq(inspections.id, input.inspectionId)).limit(1);
      if (!inspection || !inspection.submittedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "Only submitted inspection findings can be reviewed" });
      if (inspection.status !== "submitted") throw new TRPCError({ code: "CONFLICT", message: "Inspection review is already recorded" });
      if (input.outcome === "follow_up_required" && !input.notes?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Add a reason for requiring follow-up" });
      const [updated] = await db.update(inspections).set({ status: input.outcome, reviewedBy: ctx.user!.id, reviewedAt: new Date(), reviewNotes: input.notes, updatedAt: new Date() }).where(eq(inspections.id, inspection.id)).returning();
      await audit(ctx.user!.id, "inspection.reviewed", "inspection", inspection.reference, { from: inspection.status, to: input.outcome, notes: input.notes });
      await notifyUser(inspection.assignedTo, "inspection", "Inspection reviewed", `${inspection.reference} was marked ${input.outcome.replaceAll("_", " ")}.${input.notes ? ` ${input.notes}` : ""}`, "inspection", inspection.id);
      return updated;
    }),
  }),
  followUps: router({
    list: permissionProcedure("inspection:view_assigned").query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const permissions = await getUserPermissions(ctx.user!);
      const actions = permissions.has("*") || permissions.has("inspection:assign") ? await db.select().from(followUpActions).orderBy(desc(followUpActions.createdAt)) : await db.select().from(followUpActions).where(eq(followUpActions.ownerId, ctx.user!.id)).orderBy(desc(followUpActions.createdAt));
      const now = Date.now();
      for (const action of actions) if (action.dueAt && action.dueAt.getTime() < now && action.status !== "completed" && action.status !== "cancelled") await notifyUser(action.ownerId, "overdue", "Follow-up action overdue", `${action.title} passed its due date (${action.dueAt.toLocaleDateString()}).`, "follow_up", action.id, `overdue:follow_up:${action.id}:${action.ownerId}`);
      return actions;
    }),
    create: permissionProcedure("inspection:assign").input(z.object({ inspectionId: z.number().int().positive(), title: z.string().trim().min(1).max(255), ownerId: z.number().int().positive(), dueAt: z.string().datetime().optional() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [inspection] = await db.select().from(inspections).where(eq(inspections.id, input.inspectionId)).limit(1);
      if (!inspection || !inspection.submittedAt || inspection.status !== "follow_up_required") throw new TRPCError({ code: "BAD_REQUEST", message: "Follow-up actions require a reviewed finding marked for follow-up" });
      const owner = await db.select().from(users).where(eq(users.id, input.ownerId)).limit(1).then(([user]) => user);
      if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Action owner not found" });
      const ownerPermissions = await getUserPermissions(owner);
      if (!ownerPermissions.has("*") && !ownerPermissions.has("inspection:submit")) throw new TRPCError({ code: "BAD_REQUEST", message: "The action owner does not have an inspector role" });
      const [action] = await db.insert(followUpActions).values({ inspectionId: inspection.id, boreholeId: inspection.boreholeId, title: input.title, ownerId: input.ownerId, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, createdBy: ctx.user!.id }).returning();
      await audit(ctx.user!.id, "follow_up.created", "inspection", inspection.reference, input);
      await notifyUser(action.ownerId, "follow_up", "Follow-up action assigned", `${action.title}${action.dueAt ? ` · due ${action.dueAt.toLocaleDateString()}` : ""}`, "follow_up", action.id);
      return action;
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["open", "in_progress", "completed", "cancelled"]) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [action] = await db.select().from(followUpActions).where(eq(followUpActions.id, input.id)).limit(1);
      if (!action) throw new TRPCError({ code: "NOT_FOUND", message: "Follow-up action not found" });
      const permissions = await getUserPermissions(ctx.user!);
      if (action.ownerId !== ctx.user!.id && !permissions.has("*") && !permissions.has("inspection:assign")) throw new TRPCError({ code: "FORBIDDEN", message: "This action is assigned to another user" });
      const [updated] = await db.update(followUpActions).set({ status: input.status, completedAt: input.status === "completed" ? new Date() : null, updatedAt: new Date() }).where(eq(followUpActions.id, action.id)).returning();
      await audit(ctx.user!.id, "follow_up.updated", "follow_up", String(action.id), { from: action.status, to: input.status });
      if (action.createdBy !== ctx.user!.id) await notifyUser(action.createdBy, "follow_up", "Follow-up action updated", `${action.title} is now ${input.status.replaceAll("_", " ")}.`, "follow_up", action.id);
      return updated;
    }),
  }),
  screening: router({
    assess: permissionProcedure("screening:review").input(z.object({ boreholeId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [record] = await db.select().from(boreholeRecords).where(eq(boreholeRecords.id, input.boreholeId)).limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
      const [rules, layers, sources] = await Promise.all([db.select().from(screeningRules).where(eq(screeningRules.active, true)), db.select().from(hazardLayers).where(eq(hazardLayers.active, true)), db.select().from(dataSources).where(eq(dataSources.active, true))]);
      const layerByKey = new Map(layers.map((layer) => [layer.layerKey, layer])); const sourceByKey = new Map(sources.map((source) => [source.sourceKey, source]));
      const point = [Number(record.longitude), Number(record.latitude)]; const assessedAt = new Date();
      const results: Array<typeof screeningResults.$inferSelect> = [];
      const verificationStatus = (source: typeof sources[number] | undefined) => { if (!source || !source.accessStatus.toLowerCase().includes("verified")) return false; try { const metadata = JSON.parse(source.metadataJson ?? "{}") as { verificationStatus?: string }; return ["verified", "approved"].includes(metadata.verificationStatus?.toLowerCase() ?? ""); } catch { return false; } };
      for (const rule of rules.filter((item) => !item.effectiveAt || item.effectiveAt <= assessedAt)) {
        let condition: { type?: string; layerKey?: string; thresholdMeters?: number; maxDatasetAgeDays?: number } = {};
        try { condition = JSON.parse(rule.conditionJson) as typeof condition; } catch { /* malformed rules are recorded as unassessable below */ }
        const layer = condition.layerKey ? layerByKey.get(condition.layerKey) : undefined;
        const source = sourceByKey.get(rule.sourceKey);
        const layerSource = layer ? sourceByKey.get(layer.sourceKey) : undefined;
        const daysOld = layer?.datasetDate ? (assessedAt.getTime() - layer.datasetDate.getTime()) / 86400000 : Infinity;
        const stale = condition.maxDatasetAgeDays !== undefined && daysOld > condition.maxDatasetAgeDays;
        let outcome: string = "unable_to_assess"; let measuredValue: string | null = null; let thresholdValue: string | null = null; let explanation = "A required verified layer, source or supported rule configuration is unavailable. No hazard absence is inferred.";
        if (condition.type === "distance" && layer && layer.verificationStatus === "verified" && verificationStatus(source) && verificationStatus(layerSource) && !stale && layer.coordinateReferenceSystem === "EPSG:4326" && typeof condition.thresholdMeters === "number" && condition.thresholdMeters >= 0) {
          let geometry: unknown;
          try { geometry = parseGeoJson(layer.geometryJson); } catch { geometry = null; }
          const distance = geometry ? geoJsonDistanceMeters(point, geometry) : Number.POSITIVE_INFINITY;
          if (Number.isFinite(distance)) {
            measuredValue = `${distance.toFixed(1)} m`; thresholdValue = `${condition.thresholdMeters} m`;
            outcome = distance <= condition.thresholdMeters ? "flagged_for_review" : "no_configured_rule_triggered";
            explanation = distance <= condition.thresholdMeters ? `${rule.explanation} Measured distance ${distance.toFixed(1)} m is within the configured ${condition.thresholdMeters} m threshold. This is a preliminary flag for human review, not proof of contamination or non-compliance.` : `${rule.explanation} Measured distance ${distance.toFixed(1)} m is outside the configured ${condition.thresholdMeters} m threshold. This does not establish that the site is safe or free of hazards.`;
          }
        } else if (stale) explanation = `Layer data is older than the configured ${condition.maxDatasetAgeDays} day limit. Unable to assess; no hazard absence is inferred.`;
        const [result] = await db.insert(screeningResults).values({ boreholeId: record.id, ruleKey: rule.ruleKey, ruleVersion: rule.version, sourceKey: layer?.sourceKey ?? rule.sourceKey, sourceVersion: layer?.version ?? null, outcome, explanation, measuredValue, thresholdValue, assessedAt, assessedBy: ctx.user!.id }).returning();
        results.push(result);
      }
      if (results.length === 0) {
        const [result] = await db.insert(screeningResults).values({ boreholeId: record.id, outcome: "unable_to_assess", explanation: "No active, verified spatial layer and approved screening rule are currently configured for this workspace. This result does not indicate that a hazard is absent.", assessedBy: ctx.user!.id, assessedAt }).returning();
        results.push(result);
      }
      const overall = results.some((item) => item.outcome === "flagged_for_review") ? "flagged_for_review" : results.every((item) => item.outcome === "no_configured_rule_triggered") ? "no_configured_rule_triggered" : "unable_to_assess";
      await db.update(boreholeRecords).set({ screeningStatus: overall, updatedBy: ctx.user!.id, updatedAt: assessedAt }).where(eq(boreholeRecords.id, record.id));
      await audit(ctx.user!.id, "screening.assessed", "borehole", record.recordCode, { resultIds: results.map((item) => item.id), outcome: overall });
      if (overall === "flagged_for_review") await notifyPermissionHolders("screening:review", "screening", "Potential spatial conflict flagged", `${record.recordCode} matched a configured preliminary screening rule and requires human review.`, "borehole", record.id);
      return results;
    }),
    history: protectedProcedure.input(z.object({ boreholeId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      const permissions = await getUserPermissions(ctx.user!);
      if (!permissions.has("*") && !permissions.has("record:view") && !permissions.has("screening:review")) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view screening history" });
      const db = await dbOrThrow();
      const [record] = await db.select({ createdBy: boreholeRecords.createdBy }).from(boreholeRecords).where(eq(boreholeRecords.id, input.boreholeId)).limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Borehole record not found" });
      if (!permissions.has("*") && !permissions.has("record:view_all") && record.createdBy !== ctx.user!.id) {
        const [assignment] = await db.select({ id: inspections.id }).from(inspections).where(and(eq(inspections.boreholeId, input.boreholeId), eq(inspections.assignedTo, ctx.user!.id))).limit(1);
        if (!assignment) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this record's screening history" });
      }
      return db.select().from(screeningResults).where(eq(screeningResults.boreholeId, input.boreholeId)).orderBy(desc(screeningResults.assessedAt));
    }),
  }),
  reports: router({
    boreholes: permissionProcedure("report:view").input(z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional(), district: z.string().trim().max(160).optional(), operationalStatus: z.string().trim().max(64).optional() })).query(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const permissions = await getUserPermissions(ctx.user!);
      const filters = [];
      if (input.from) filters.push(gte(boreholeRecords.createdAt, new Date(input.from)));
      if (input.to) filters.push(lte(boreholeRecords.createdAt, new Date(input.to)));
      if (input.district) filters.push(eq(boreholeRecords.district, input.district));
      if (input.operationalStatus) filters.push(eq(boreholeRecords.operationalStatus, input.operationalStatus));
      if (!permissions.has("*") && !permissions.has("record:view_all")) filters.push(eq(boreholeRecords.createdBy, ctx.user!.id));
      const rows = await db.select().from(boreholeRecords).where(and(...filters)).orderBy(desc(boreholeRecords.createdAt));
      await audit(ctx.user!.id, "report.boreholes_viewed", "report", "boreholes", input);
      return rows;
    }),
    logExport: permissionProcedure("report:view").input(z.object({ from: z.string().datetime().optional(), to: z.string().datetime().optional(), district: z.string().trim().max(160).optional(), operationalStatus: z.string().trim().max(64).optional(), rowCount: z.number().int().min(0).max(100000), notes: z.string().trim().max(2000).optional(), exportFormat: z.enum(["csv", "pdf"]).default("csv") })).mutation(async ({ ctx, input }) => {
      await audit(ctx.user!.id, `report.${input.exportFormat}_exported`, "report", "boreholes", input);
      return { success: true } as const;
    }),
  }),
  evidence: router({
    list: protectedProcedure.input(z.object({
      entityType: z.enum(["borehole", "application", "inspection"]),
      entityId: z.number().int().positive(),
    })).query(async ({ ctx, input }) => {
      await assertEvidenceAccess(ctx.user!, input.entityType, input.entityId, false);
      const db = await dbOrThrow();
      const files = await db.select().from(evidenceFiles)
        .where(and(eq(evidenceFiles.entityType, input.entityType), eq(evidenceFiles.entityId, input.entityId)))
        .orderBy(desc(evidenceFiles.createdAt));
      return Promise.all(files.map(async (file) => ({ ...file, downloadUrl: await getEvidenceUrl(file.storageKey) })));
    }),
    upload: protectedProcedure.input(z.object({
      entityType: z.enum(["borehole", "application", "inspection"]),
      entityId: z.number().int().positive(),
      fileName: z.string().trim().min(1).max(255),
      documentType: z.string().trim().max(96).optional(),
      contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
      contentBase64: z.string().min(4).max(14_000_000).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/, "File data must be valid base64"),
    })).mutation(async ({ ctx, input }) => {
      await assertEvidenceAccess(ctx.user!, input.entityType, input.entityId, true);
      if (input.entityType === "application" && input.documentType && !["site_plan", "land_authority", "technical_details", "supporting_documents"].includes(input.documentType)) throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown application document category" });
      const bytes = Buffer.from(input.contentBase64, "base64");
      if (!bytes.length || bytes.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Evidence files must be between 1 byte and 10 MB" });
      }
      const db = await dbOrThrow();
      const fileName = input.fileName.split(/[\\/]/).at(-1)?.replace(/[\u0000-\u001f]/g, "").slice(0, 255);
      if (!fileName) throw new TRPCError({ code: "BAD_REQUEST", message: "File name is invalid" });
      const storageKey = `evidence/${input.entityType}/${input.entityId}/${crypto.randomUUID()}`;
      await uploadEvidence(storageKey, bytes, input.contentType);
      try {
        const file = await db.transaction(async (tx) => {
          const [created] = await tx.insert(evidenceFiles).values({
            entityType: input.entityType,
            entityId: input.entityId,
            storageKey,
            fileName,
            documentType: input.documentType,
            contentType: input.contentType,
            byteSize: bytes.length,
            uploadedBy: ctx.user!.id,
          }).returning();
          await tx.insert(auditEvents).values({
            actorId: ctx.user!.id,
            action: "evidence.uploaded",
            resourceType: input.entityType,
            resourceId: String(input.entityId),
            detailJson: JSON.stringify({ fileName, documentType: input.documentType, contentType: input.contentType, byteSize: bytes.length }),
          });
          return created;
        });
        return file;
      } catch (error) {
        try {
          await deleteEvidence(storageKey);
        } catch (cleanupError) {
          console.error("[Evidence] Failed to remove an object after metadata write failed:", cleanupError);
        }
        throw error;
      }
    }),
  }),
  administration: router({
    users: permissionProcedure("user:manage").query(async () => {
      const db = await dbOrThrow();
      const allUsers = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).orderBy(users.email);
      const assignments = await db.select({ userId: userWorkspaceRoles.userId, roleKey: workspaceRoles.roleKey, roleName: workspaceRoles.name }).from(userWorkspaceRoles).innerJoin(workspaceRoles, eq(workspaceRoles.id, userWorkspaceRoles.roleId));
      return allUsers.map((user) => ({ ...user, workspaceRoles: assignments.filter((assignment) => assignment.userId === user.id) }));
    }),
    assignRole: permissionProcedure("user:manage").input(z.object({ userId: z.number().int().positive(), roleKey: z.string().trim().min(1).max(64) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [role] = await db.select().from(workspaceRoles).where(eq(workspaceRoles.roleKey, input.roleKey)).limit(1);
      if (!role) throw new Error("Workspace role not found");
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new Error("User not found");
      const [existing] = await db.select().from(userWorkspaceRoles).where(and(eq(userWorkspaceRoles.userId, user.id), eq(userWorkspaceRoles.roleId, role.id))).limit(1);
      if (!existing) await db.insert(userWorkspaceRoles).values({ userId: user.id, roleId: role.id, assignedBy: ctx.user!.id });
      await audit(ctx.user!.id, "role.assigned", "user", String(user.id), { roleKey: input.roleKey });
      return { success: true } as const;
    }),
    removeRole: permissionProcedure("user:manage").input(z.object({ userId: z.number().int().positive(), roleKey: z.string().trim().min(1).max(64) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      const [role] = await db.select().from(workspaceRoles).where(eq(workspaceRoles.roleKey, input.roleKey)).limit(1);
      if (!user || !role) throw new TRPCError({ code: "NOT_FOUND", message: "User or role not found" });
      await db.delete(userWorkspaceRoles).where(and(eq(userWorkspaceRoles.userId, user.id), eq(userWorkspaceRoles.roleId, role.id)));
      await audit(ctx.user!.id, "role.removed", "user", String(user.id), { roleKey: input.roleKey });
      return { success: true } as const;
    }),
    updateDataSource: permissionProcedure("layer:configure").input(z.object({ sourceKey: z.string().trim().min(1).max(96), purpose: z.string().trim().min(1).max(2000), accessStatus: z.string().trim().min(1).max(255), metadataJson: z.string().max(12000).nullable(), active: z.boolean() })).mutation(async ({ ctx, input }) => {
      let metadata: unknown = null;
      if (input.metadataJson) { try { metadata = JSON.parse(input.metadataJson); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Source metadata must be valid JSON" }); } }
      const db = await dbOrThrow();
      const [before] = await db.select().from(dataSources).where(eq(dataSources.sourceKey, input.sourceKey)).limit(1);
      const [updated] = await db.update(dataSources).set({ purpose: input.purpose, accessStatus: input.accessStatus, metadataJson: metadata === null ? null : JSON.stringify(metadata), active: input.active, updatedBy: ctx.user!.id, updatedAt: new Date() }).where(eq(dataSources.sourceKey, input.sourceKey)).returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Data source not found" });
      await audit(ctx.user!.id, "data_source.updated", "data_source", input.sourceKey, { before, after: updated });
      return updated;
    }),
    saveHazardLayer: permissionProcedure("layer:configure").input(z.object({ layerKey: z.string().trim().min(1).max(96), name: z.string().trim().min(1).max(255), sourceKey: z.string().trim().min(1).max(96), version: z.string().trim().min(1).max(96), geometryJson: z.string().min(2).max(8_000_000), datasetDate: z.string().datetime().nullable(), coordinateReferenceSystem: z.literal("EPSG:4326"), coverageJson: z.string().max(12000).nullable(), accuracyNotes: z.string().max(2000).nullable(), licenseNotes: z.string().max(2000).nullable(), verificationStatus: z.enum(["unverified", "verified", "stale", "demonstration"]), active: z.boolean() })).mutation(async ({ ctx, input }) => {
      try { parseGeoJson(input.geometryJson); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Invalid GeoJSON layer" }); }
      const db = await dbOrThrow();
      const [source] = await db.select().from(dataSources).where(eq(dataSources.sourceKey, input.sourceKey)).limit(1);
      if (!source) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an existing source for this layer" });
      let sourceMetadata: { verificationStatus?: string } = {};
      try { sourceMetadata = JSON.parse(source.metadataJson ?? "{}") as typeof sourceMetadata; } catch { /* Invalid metadata cannot qualify as verified */ }
      const sourceVerified = source.accessStatus.toLowerCase().includes("verified") && ["verified", "approved"].includes(sourceMetadata.verificationStatus?.toLowerCase() ?? "");
      if (input.active && (input.verificationStatus !== "verified" || !sourceVerified || !input.datasetDate || !input.accuracyNotes?.trim() || !input.licenseNotes?.trim())) throw new TRPCError({ code: "BAD_REQUEST", message: "An active layer requires a verified source, dataset date, accuracy notes and data-use terms" });
      if (input.coverageJson) { try { JSON.parse(input.coverageJson); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Coverage metadata must be valid JSON" }); } }
      const [existing] = await db.select().from(hazardLayers).where(eq(hazardLayers.layerKey, input.layerKey)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Layer records are immutable; use a new layer key for each version" });
      const values = { ...input, datasetDate: input.datasetDate ? new Date(input.datasetDate) : null, updatedBy: ctx.user!.id, updatedAt: new Date() };
      const [saved] = await db.insert(hazardLayers).values(values).returning();
      await audit(ctx.user!.id, "hazard_layer.saved", "hazard_layer", input.layerKey, { version: input.version, sourceKey: input.sourceKey, verificationStatus: input.verificationStatus, active: input.active });
      return saved;
    }),
    deactivateHazardLayer: permissionProcedure("layer:configure").input(z.object({ layerKey: z.string().trim().min(1).max(96), reason: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [layer] = await db.select().from(hazardLayers).where(eq(hazardLayers.layerKey, input.layerKey)).limit(1);
      if (!layer) throw new TRPCError({ code: "NOT_FOUND", message: "Hazard layer not found" });
      const [saved] = await db.update(hazardLayers).set({ active: false, updatedBy: ctx.user!.id, updatedAt: new Date() }).where(eq(hazardLayers.id, layer.id)).returning();
      await audit(ctx.user!.id, "hazard_layer.deactivated", "hazard_layer", input.layerKey, { reason: input.reason });
      return saved;
    }),
    saveScreeningRule: permissionProcedure("layer:configure").input(z.object({ ruleKey: z.string().trim().min(1).max(96), name: z.string().trim().min(1).max(255), version: z.string().trim().min(1).max(64), jurisdiction: z.string().trim().min(1).max(160), hazardType: z.string().trim().min(1).max(96), conditionJson: z.string().min(2).max(12000), sourceKey: z.string().trim().min(1).max(96), sourceReference: z.string().trim().max(2000).nullable(), effectiveAt: z.string().datetime().nullable(), approvedBy: z.string().trim().max(255).nullable(), explanation: z.string().trim().min(1).max(2000), active: z.boolean() })).mutation(async ({ ctx, input }) => {
      let condition: { type?: string; layerKey?: string; thresholdMeters?: number; maxDatasetAgeDays?: number };
      try { condition = JSON.parse(input.conditionJson) as typeof condition; } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Rule condition must be valid JSON" }); }
      if (condition.type !== "distance" || !condition.layerKey || typeof condition.thresholdMeters !== "number" || condition.thresholdMeters < 0 || condition.maxDatasetAgeDays !== undefined && condition.maxDatasetAgeDays <= 0) throw new TRPCError({ code: "BAD_REQUEST", message: "A screening distance rule needs type distance, a layer key and a non-negative threshold in metres" });
      if (input.active && (!input.approvedBy || !input.effectiveAt || !input.sourceReference)) throw new TRPCError({ code: "BAD_REQUEST", message: "An active rule requires an approver, effective date and authoritative source reference" });
      const db = await dbOrThrow();
      const [source] = await db.select().from(dataSources).where(eq(dataSources.sourceKey, input.sourceKey)).limit(1);
      if (!source) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose an existing data source for this rule" });
      if (input.active) {
        let sourceMetadata: { verificationStatus?: string } = {};
        try { sourceMetadata = JSON.parse(source.metadataJson ?? "{}") as typeof sourceMetadata; } catch { /* invalid source metadata cannot qualify as verified */ }
        if (!source.accessStatus.toLowerCase().includes("verified") || !["verified", "approved"].includes(sourceMetadata.verificationStatus?.toLowerCase() ?? "")) throw new TRPCError({ code: "BAD_REQUEST", message: "This rule cannot be activated until its source metadata is explicitly marked verified" });
        const [layer] = await db.select().from(hazardLayers).where(eq(hazardLayers.layerKey, condition.layerKey)).limit(1);
        if (!layer || !layer.active || layer.verificationStatus !== "verified" || layer.sourceKey !== input.sourceKey) throw new TRPCError({ code: "BAD_REQUEST", message: "Activate the verified spatial layer from the same source before activating this rule" });
      }
      const [existingRule] = await db.select({ id: screeningRules.id }).from(screeningRules).where(and(eq(screeningRules.ruleKey, input.ruleKey), eq(screeningRules.version, input.version))).limit(1);
      if (existingRule) throw new TRPCError({ code: "CONFLICT", message: "Rule versions are immutable; save changes as a new version" });
      const [saved] = await db.insert(screeningRules).values({ ...input, effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : null, updatedBy: ctx.user!.id, updatedAt: new Date() }).returning();
      await audit(ctx.user!.id, "screening_rule.updated", "screening_rule", input.ruleKey, input);
      return saved;
    }),
    deactivateScreeningRule: permissionProcedure("layer:configure").input(z.object({ ruleKey: z.string().trim().min(1).max(96), version: z.string().trim().min(1).max(64), reason: z.string().trim().min(1).max(2000) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [rule] = await db.select().from(screeningRules).where(and(eq(screeningRules.ruleKey, input.ruleKey), eq(screeningRules.version, input.version))).limit(1);
      if (!rule) throw new TRPCError({ code: "NOT_FOUND", message: "Rule version not found" });
      const [updated] = await db.update(screeningRules).set({ active: false, updatedBy: ctx.user!.id, updatedAt: new Date() }).where(eq(screeningRules.id, rule.id)).returning();
      await audit(ctx.user!.id, "screening_rule.deactivated", "screening_rule", `${input.ruleKey}@${input.version}`, { reason: input.reason });
      return updated;
    }),
    updateSettings: permissionProcedure("workflow:configure").input(z.object({ localAuthorityValue: z.string().trim().max(255).nullable().optional(), workflowJson: z.string().min(2) })).mutation(async ({ ctx, input }) => {
      let parsed: unknown;
      try { parsed = JSON.parse(input.workflowJson); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Workflow configuration must be valid JSON" }); }
      const workflow = parsed as { stages?: Array<{ key?: unknown; label?: unknown; allowedNext?: unknown }> };
      if (!workflow || !Array.isArray(workflow.stages) || workflow.stages.length < 2 || workflow.stages.length > 40) throw new TRPCError({ code: "BAD_REQUEST", message: "Workflow must define between 2 and 40 stages" });
      const keys = new Set<string>();
      for (const stage of workflow.stages) {
        if (typeof stage.key !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(stage.key) || keys.has(stage.key) || typeof stage.label !== "string" || !stage.label.trim() || !Array.isArray(stage.allowedNext) || stage.allowedNext.some((key) => typeof key !== "string")) throw new TRPCError({ code: "BAD_REQUEST", message: "Every workflow stage needs a unique key, label and allowedNext list" });
        keys.add(stage.key);
      }
      if (workflow.stages.some((stage) => (stage.allowedNext as string[]).some((key) => !keys.has(key)))) throw new TRPCError({ code: "BAD_REQUEST", message: "Workflow transitions must point to defined stages" });
      const db = await dbOrThrow();
      await db.update(workspaceSettings).set({ localAuthorityValue: input.localAuthorityValue, workflowJson: input.workflowJson, updatedBy: ctx.user!.id }).where(eq(workspaceSettings.id, 1));
      await audit(ctx.user!.id, "workspace.settings_updated", "workspace", "1", input);
      return { success: true } as const;
    }),
    audit: permissionProcedure("audit:view").query(async () => {
      const db = await dbOrThrow();
      return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(100);
    }),
  }),
});
