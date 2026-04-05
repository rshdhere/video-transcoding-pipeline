import { initTRPC, TRPCError } from "@trpc/server"
import type { createContext } from "./trpc/context.js";

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const privateProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED"
    })
  }

  return next({
    ctx: {
      userId: ctx.user
    }
  })
})
