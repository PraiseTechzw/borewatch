import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Request } from "express";
import { ENV } from "./env";
import type { User } from "../../drizzle/schema";
import * as db from "../db";

type NeonAuthClaims = {
  sub: string;
  email: string;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (!ENV.neonAuthJwksUrl) throw new Error("NEON_AUTH_JWKS_URL is required to verify Neon Auth sessions");
  jwks ??= createRemoteJWKSet(new URL(ENV.neonAuthJwksUrl));
  return jwks;
}

function getBearerToken(req: Request) {
  const authorization = req.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  let claims: NeonAuthClaims;
  try {
    const result = await jwtVerify(token, getJwks());
    const payload = result.payload;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    claims = {
      sub: payload.sub,
      email: payload.email,
    };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
      if (error.code.startsWith("ERR_JWT_") || error.code.startsWith("ERR_JWS_") || error.code === "ERR_JWKS_NO_MATCHING_KEY") return null;
    }
    throw error;
  }

  const identity = await db.getNeonAuthIdentity(claims.sub);
  if (!identity || identity.email.trim().toLowerCase() !== claims.email.trim().toLowerCase()) return null;
  const email = identity.email.trim().toLowerCase();
  if (!email) return null;
  return db.syncNeonUser({
    neonUserId: claims.sub,
    email,
    name: identity.name,
    verifiedOwner: identity.emailVerified && ENV.ownerEmail === email,
  });
}
