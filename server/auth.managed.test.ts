import { describe, expect, it } from "vitest";
import { authenticateRequest } from "./_core/auth";
import type { Request } from "express";

describe("Neon Managed Auth", () => {
  it("treats requests without a bearer token as unauthenticated", async () => {
    const req = {
      headers: {},
      header: () => undefined,
    } as unknown as Request;

    await expect(authenticateRequest(req)).resolves.toBeNull();
  });

  it("rejects malformed bearer tokens without a local session", async () => {
    process.env.NEON_AUTH_JWKS_URL = "https://auth.example.test/.well-known/jwks.json";
    const req = {
      headers: { authorization: "Bearer not-a-jwt" },
      header: (name: string) => name.toLowerCase() === "authorization" ? "Bearer not-a-jwt" : undefined,
    } as unknown as Request;

    await expect(authenticateRequest(req)).resolves.toBeNull();
  });
});
