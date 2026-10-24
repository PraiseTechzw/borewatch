import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  applications,
  auditEvents,
  boreholeRecords,
  dataSources,
  userWorkspaceRoles,
  users,
  workflowEvents,
  workspaceRoles,
  workspaceSettings,
} from "../drizzle/schema";
import { getDb } from "./db";
import { permissionProcedure, adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { getUserPermissions } from "./permissions";

const coordinate = (min: number, max: number) => z.string().refine((value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}, "Coordinate must be a valid decimal-degree value in range");
const dbOrThrow = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database is not available; configure DATABASE_URL before using the authenticated application");
  return db;
};
async function audit(actorId: number, action: string, resourceType: string, resourceId: string, detail: unknown) {
  const db = await dbOrThrow();
  await db.insert(auditEvents).values({ actorId, action, resourceType, resourceId, detailJson: JSON.stringify(detail) });
}
async function getSettings() {
  const db = await dbOrThrow();
  const [settings] = await db.select().from(workspaceSettings).where(eq(workspaceSettings.id, 1)).limit(1);
  if (!settings) throw new Error("Workspace configuration has not been initialized");
  return settings;
}

export const borewatchRouter = router({
  workspace: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await dbOrThrow();
      const [settings] = await db.select().from(workspaceSettings).where(eq(workspaceSettings.id, 1)).limit(1);
      if (!settings) throw new Error("Workspace configuration has not been initialized");
      const [roles, sources] = await Promise.all([
        db.select().from(workspaceRoles).where(eq(workspaceRoles.active, true)),
        db.select().from(dataSources).where(eq(dataSources.active, true)),
      ]);
      const permissions = await getUserPermissions(ctx.user!);
      return { settings: { ...settings, workflow: JSON.parse(settings.workflowJson) }, roles, sources, permissions: [...permissions] };
    }),
  }),
  boreholes: router({
    list: permissionProcedure("record:view").query(async () => {
      const db = await dbOrThrow();
      return db.select().from(boreholeRecords).orderBy(desc(boreholeRecords.updatedAt));
    }),
    create: permissionProcedure("record:create")
      .input(z.object({
        siteName: z.string().trim().min(1).max(255),
        district: z.string().trim().min(1).max(160),
        purpose: z.string().trim().min(1).max(160),
        latitude: coordinate(-90, 90),
        longitude: coordinate(-180, 180),
        localAuthorityValue: z.string().trim().max(255).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const recordCode = `BW-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
        await db.insert(boreholeRecords).values({
          recordCode,
          siteName: input.siteName,
          district: input.district,
          purpose: input.purpose,
          latitude: input.latitude,
          longitude: input.longitude,
          operationalStatus: "unverified",
          applicationStatus: "draft",
          screeningStatus: "unable_to_assess",
          localAuthorityValue: input.localAuthorityValue,
          createdBy: ctx.user!.id,
          updatedBy: ctx.user!.id,
        });
        const [record] = await db.select().from(boreholeRecords).where(eq(boreholeRecords.recordCode, recordCode)).limit(1);
        await audit(ctx.user!.id, "record.created", "borehole", recordCode, input);
        return record;
      }),
    update: permissionProcedure("record:update")
      .input(z.object({
        id: z.number().int().positive(),
        siteName: z.string().trim().min(1).max(255).optional(),
        district: z.string().trim().min(1).max(160).optional(),
        purpose: z.string().trim().min(1).max(160).optional(),
        operationalStatus: z.string().trim().min(1).max(64).optional(),
        localAuthorityValue: z.string().trim().max(255).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const { id, ...changes } = input;
        await db.update(boreholeRecords).set({ ...changes, updatedBy: ctx.user!.id }).where(eq(boreholeRecords.id, id));
        const [record] = await db.select().from(boreholeRecords).where(eq(boreholeRecords.id, id)).limit(1);
        if (!record) throw new Error("Borehole record not found");
        await audit(ctx.user!.id, "record.updated", "borehole", record.recordCode, changes);
        return record;
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
      .input(z.object({ boreholeId: z.number().int().positive().optional(), localAuthorityValue: z.string().trim().max(255).optional(), completeness: z.record(z.string(), z.boolean()).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const reference = `APP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
        await db.insert(applications).values({ reference, boreholeId: input.boreholeId, applicantId: ctx.user!.id, stage: "draft", localAuthorityValue: input.localAuthorityValue, completenessJson: JSON.stringify(input.completeness ?? {}), updatedBy: ctx.user!.id });
        const [application] = await db.select().from(applications).where(eq(applications.reference, reference)).limit(1);
        await audit(ctx.user!.id, "application.created", "application", reference, input);
        return application;
      }),
    transition: permissionProcedure("application:transition")
      .input(z.object({ applicationId: z.number().int().positive(), toStage: z.string().trim().min(1).max(64), reason: z.string().trim().max(2000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await dbOrThrow();
        const [application] = await db.select().from(applications).where(eq(applications.id, input.applicationId)).limit(1);
        if (!application) throw new Error("Application not found");
        const settings = await getSettings();
        const workflow = JSON.parse(settings.workflowJson) as { stages: Array<{ key: string; allowedNext: string[] }> };
        const current = workflow.stages.find((stage) => stage.key === application.stage);
        if (!current || !current.allowedNext.includes(input.toStage)) throw new Error("Workflow transition is not configured");
        await db.update(applications).set({ stage: input.toStage, updatedBy: ctx.user!.id, submittedAt: input.toStage === "submitted" ? new Date() : application.submittedAt }).where(eq(applications.id, application.id));
        await db.insert(workflowEvents).values({ applicationId: application.id, fromStage: application.stage, toStage: input.toStage, actorId: ctx.user!.id, reason: input.reason });
        await audit(ctx.user!.id, "application.transitioned", "application", application.reference, input);
        return db.select().from(applications).where(eq(applications.id, application.id)).limit(1).then(([updated]) => updated);
      }),
  }),
  administration: router({
    assignRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), roleKey: z.string().trim().min(1).max(64) })).mutation(async ({ ctx, input }) => {
      const db = await dbOrThrow();
      const [role] = await db.select().from(workspaceRoles).where(eq(workspaceRoles.roleKey, input.roleKey)).limit(1);
      if (!role) throw new Error("Workspace role not found");
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) throw new Error("User not found");
      await db.insert(userWorkspaceRoles).values({ userId: user.id, roleId: role.id, assignedBy: ctx.user!.id });
      await audit(ctx.user!.id, "role.assigned", "user", String(user.id), { roleKey: input.roleKey });
      return { success: true } as const;
    }),
    updateSettings: adminProcedure.input(z.object({ localAuthorityValue: z.string().trim().max(255).nullable().optional(), workflowJson: z.string().min(2) })).mutation(async ({ ctx, input }) => {
      JSON.parse(input.workflowJson);
      const db = await dbOrThrow();
      await db.update(workspaceSettings).set({ localAuthorityValue: input.localAuthorityValue, workflowJson: input.workflowJson, updatedBy: ctx.user!.id }).where(eq(workspaceSettings.id, 1));
      await audit(ctx.user!.id, "workspace.settings_updated", "workspace", "1", input);
      return { success: true } as const;
    }),
    audit: adminProcedure.query(async () => {
      const db = await dbOrThrow();
      return db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(100);
    }),
  }),
});
