import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

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

  return betterAuth({
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.BETTER_AUTH_URL,
    basePath: "/api/v1/auth",
    trustedOrigins: config.TRUSTED_ORIGINS,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
    },
    experimental: {
      joins: true,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
