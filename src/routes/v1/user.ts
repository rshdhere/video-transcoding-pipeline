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

      const code = error?.body?.code;

      if (code === "EMAIL_NOT_VERIFIED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Email not verified"
        });
      }

      if (code === "INVALID_EMAIL_OR_PASSWORD") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password"
        });
      }

      // fallback
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Something went wrong"
      });
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

      const code = error?.body?.code;

      if (code === "EMAIL_NOT_VERIFIED") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Email not verified"
        });
      }

      if (code === "INVALID_EMAIL_OR_PASSWORD") {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password"
        });
      }

      // fallback
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Something went wrong"
      });

    }
  })
  )
})
