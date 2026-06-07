import { defineConfig } from "drizzle-kit";

const defaultDatabaseUrl = "postgresql://vtp:vtp@localhost:5432/vtp";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? defaultDatabaseUrl,
  },
});
