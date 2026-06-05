import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createMailer } from "@vtp/mail";

import type { Config } from "@vtp/config";
import {
  account,
  accountRelations,
  createDb,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
} from "@vtp/drizzle";

const authSchema = {
  user,
  session,
  account,
  verification,
  userRelations,
  sessionRelations,
  accountRelations,
};

export function createAuth(config: Config) {
  const db = createDb(config.DATABASE_URL);
  const mailer = createMailer({
    apiKey: config.RESEND_API_KEY ?? "",
    fromEmail: config.RESEND_FROM_EMAIL,
    enabled: config.MAIL_ENABLED,
  });

  return betterAuth({
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    basePath: "/api/v1/auth",
    trustedOrigins: config.TRUSTED_ORIGINS,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await mailer.sendVerificationEmail({
          to: user.email,
          url,
        });
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: config.REQUIRE_EMAIL_VERIFICATION,
    },
    experimental: {
      joins: true,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
