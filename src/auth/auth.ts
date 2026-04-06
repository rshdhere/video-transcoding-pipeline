import { betterAuth } from "better-auth";
import { dbClient } from "../drizzle/src/index.js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../drizzle/src/database/schema.js";
import { enqueueEmailJob } from "@/queue/enqueue.js";

export const auth = betterAuth({
  database: drizzleAdapter((dbClient), {
    schema,
    provider: "pg"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },

  emailVerification: {
    async sendVerificationEmail({ url, user }) {
      await enqueueEmailJob({
        type: "VERIFY_EMAIL",
        userEmail: user.email,
        verificationUrl: url
      })
    }
  }
})
