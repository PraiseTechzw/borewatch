import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SESSION_MAX_AGE_MS, COOKIE_NAME } from "@shared/const";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
export function hashSessionToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash); }
export async function createLoginSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await db.createSession(hashSessionToken(token), userId, new Date(Date.now() + SESSION_MAX_AGE_MS));
  return token;
}
export function getSessionToken(req: Request) { const cookie = parseCookieHeader(req.headers.cookie ?? ""); return cookie[COOKIE_NAME]; }
export async function authenticateRequest(req: Request): Promise<User> {
  const token = getSessionToken(req);
  if (!token) throw new Error("Unauthenticated");
  const user = await db.getUserBySessionHash(hashSessionToken(token));
  if (!user) throw new Error("Unauthenticated");
  return user;
}
