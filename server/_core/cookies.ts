import type { CookieOptions, Request } from "express";
import { ENV } from "./env";
export function getSessionCookieOptions(_req: Request): CookieOptions { return { httpOnly: true, path: "/", sameSite: "lax", secure: ENV.isProduction }; }
