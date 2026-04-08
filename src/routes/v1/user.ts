import { auth } from "@/auth/auth.js";
import { TRPCError } from "@trpc/server";
import { authSchema } from "@/types/index.js";
import { publicProcedure, router } from "@/trpc.js";

export const userRouter = router({
  signup: publicProcedure.input(authSchema.input).mutation(async ({ input }) => {

    try {
      const response = await auth.api.signUpEmail({
        body: {
          name: input.name,
          email: input.email,
          password: input.password
        }
      })

      return response

    } catch (error: any) {

      console.error("[error]:", JSON.stringify(error, null, 2))

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "unknown error"
      })
    }

  }),

  login: publicProcedure.input(authSchema.input).mutation((async ({ input }) => {

    try {
      const response = await auth.api.signInEmail({
        body: {
          email: input.email,
          password: input.password
        }
      })

      return response

    } catch (error: any) {

      console.error("[error]:", JSON.stringify(error, null, 2))

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "unknown error"
      })

    }
  })
  )
})
