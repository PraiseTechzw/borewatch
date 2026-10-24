import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { userWorkspaceRoles, workspaceRoles, type User } from "../drizzle/schema";

export type Permission =
  | "record:view"
  | "record:create"
  | "record:update"
  | "application:create"
  | "application:view_own"
  | "application:review"
  | "application:transition"
  | "inspection:view_assigned"
  | "inspection:submit"
  | "screening:review"
  | "information:request"
  | "decision:record"
  | "layer:view"
  | "layer:configure"
  | "workflow:configure"
  | "user:manage"
  | "audit:view"
  | "report:view";

export async function getUserPermissions(user: User): Promise<Set<string>> {
  if (user.role === "admin") return new Set(["*"]);
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select({ permissionsJson: workspaceRoles.permissionsJson })
    .from(userWorkspaceRoles)
    .innerJoin(workspaceRoles, eq(workspaceRoles.id, userWorkspaceRoles.roleId))
    .where(and(eq(userWorkspaceRoles.userId, user.id), eq(workspaceRoles.active, true)));
  const permissions = new Set<string>();
  for (const row of rows) {
    try {
      const values = JSON.parse(row.permissionsJson) as unknown;
      if (Array.isArray(values)) values.filter((value): value is string => typeof value === "string").forEach((value) => permissions.add(value));
    } catch {
      throw new Error("Invalid permissions configuration");
    }
  }
  return permissions;
}

export async function hasPermission(user: User, permission: Permission): Promise<boolean> {
  const permissions = await getUserPermissions(user);
  return permissions.has("*") || permissions.has(permission);
}
