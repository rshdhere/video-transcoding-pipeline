import { loadConfig } from "@vtp/config";

export const testConfig = loadConfig({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://vtp:vtp@localhost:5432/vtp",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    "dev-secret-key-at-least-32-characters-long",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  SERVER_PORT: process.env.SERVER_PORT ?? "3001",
  TRUSTED_ORIGINS:
    process.env.TRUSTED_ORIGINS ??
    "http://localhost:3000,http://localhost:3001",
});
