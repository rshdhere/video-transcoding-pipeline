import { initTRPC, TRPCError } from "@trpc/server"

export type Context = {
  userId?: string
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const privateProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED"
    })
  }

  return next({
    ctx: {
      userId: ctx.userId
    }
  })
})
