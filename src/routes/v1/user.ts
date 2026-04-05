import { auth } from "@/auth/auth.js";
import { authSchema } from "@/types/index.js";
import { publicProcedure, router } from "@/trpc.js";

export const userRouter = router({
  signup: publicProcedure.input(authSchema.input).mutation(async ({ input }) => {

    const response = await auth.api.signUpEmail({
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
      }
    })

    return response

  })
})
