import { publicProcedure, router } from "./_core/trpc";
import { borewatchRouter } from "./borewatchRouter";

export const appRouter = router({
  borewatch: borewatchRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user ? { id: opts.ctx.user.id, email: opts.ctx.user.email, name: opts.ctx.user.name, role: opts.ctx.user.role } : null),
  }),
});

export type AppRouter = typeof appRouter;
