import { and, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { authSessions, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try { _db = drizzle(ENV.databaseUrl); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createUser(input: { email: string; name: string; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const email = input.email.trim().toLowerCase();
  const role = ENV.ownerEmail && ENV.ownerEmail === email ? "admin" : "user";
  const values: InsertUser = { email, name: input.name.trim() || null, passwordHash: input.passwordHash, emailVerified: false, role, lastSignedIn: new Date() };
  const result = await db.insert(users).values(values);
  const userId = Number(result[0].insertId);
  const user = await getUserById(userId);
  if (!user) throw new Error("Account could not be created");
  return user;
}

export async function touchUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function createSession(tokenHash: string, userId: number, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(authSessions).values({ tokenHash, userId, expiresAt });
}

export async function getUserBySessionHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ user: users, session: authSessions }).from(authSessions).innerJoin(users, eq(authSessions.userId, users.id)).where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, new Date()))).limit(1);
  if (result[0]) await db.update(authSessions).set({ lastSeenAt: new Date() }).where(eq(authSessions.id, result[0].session.id));
  return result[0]?.user;
}

export async function deleteSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
}
