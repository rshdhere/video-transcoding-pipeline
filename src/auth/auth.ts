import { betterAuth } from "better-auth";
import { dbClient } from "../drizzle/src/index.js";
import { enqueueEmailJob } from "@/queue/enqueue.js";
import * as schema from "../drizzle/src/database/schema.js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  BACKEND_URL,
  FRONTEND_URL,
  OAUTH_GITHUB_CLIENT_ID,
  OAUTH_GITHUB_CLIENT_SECRET,
  OAUTH_GOOGLE_CLIENT_ID,
  OAUTH_GOOGLE_CLIENT_SECRET
} from "@/config/config.js";

export const auth = betterAuth({
  trustedOrigins: [FRONTEND_URL],
  baseURL: BACKEND_URL,
  database: drizzleAdapter((dbClient), {
    schema,
    provider: "pg"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true
  },
  socialProviders: {
    github: {
      clientId: OAUTH_GITHUB_CLIENT_ID,
      clientSecret: OAUTH_GITHUB_CLIENT_SECRET
    },
    google: {
      clientId: OAUTH_GOOGLE_CLIENT_ID,
      clientSecret: OAUTH_GOOGLE_CLIENT_SECRET
    }
  },
  emailVerification: {
    async sendVerificationEmail({ url, user }) {

      const verificationUrl = new URL(url)
      verificationUrl.searchParams.set("callbackURL", `${FRONTEND_URL}/dashboard`)

      await enqueueEmailJob({
        type: "VERIFY_EMAIL",
        userEmail: user.email,
        verificationUrl: verificationUrl.toString()
      })
    },
    autoSignInAfterVerification: true,
  }
})
