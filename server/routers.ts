import { COOKIE_NAME, SESSION_MAX_AGE_MS, UNAUTHED_ERR_MSG } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { createLoginSession, getSessionToken, hashPassword, hashSessionToken, normalizeEmail, verifyPassword } from "./_core/auth";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { borewatchRouter } from "./borewatchRouter";
import * as db from "./db";

const credentials = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(12).max(200),
});

export const appRouter = router({
  borewatch: borewatchRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? { id: opts.ctx.user.id, email: opts.ctx.user.email, name: opts.ctx.user.name, role: opts.ctx.user.role } : null),
    register: publicProcedure.input(credentials.extend({ name: z.string().trim().min(1).max(160) })).mutation(async ({ input, ctx }) => {
      const email = normalizeEmail(input.email);
      if (await db.getUserByEmail(email)) throw new TRPCError({ code: "CONFLICT", message: "An account with that email already exists" });
      try {
        const user = await db.createUser({ email, name: input.name, passwordHash: await hashPassword(input.password) });
        const token = await createLoginSession(user.id);
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: SESSION_MAX_AGE_MS });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      } catch (error) {
        if (String(error).toLowerCase().includes("duplicate")) throw new TRPCError({ code: "CONFLICT", message: "An account with that email already exists" });
        throw error;
      }
    }),
    login: publicProcedure.input(credentials).mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(normalizeEmail(input.email));
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect" });
      await db.touchUser(user.id);
      const token = await createLoginSession(user.id);
      ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: SESSION_MAX_AGE_MS });
      return { id: user.id, email: user.email, name: user.name, role: user.role };
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = getSessionToken(ctx.req);
      if (token) await db.deleteSession(hashSessionToken(token));
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: 0 });
      return { success: true } as const;
    }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12).max(200) })).mutation(async ({ input, ctx }) => {
      if (!(await verifyPassword(input.currentPassword, ctx.user.passwordHash))) throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database is not available" });
      const { users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      await database.update(users).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(users.id, ctx.user.id));
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
