import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://vtp:vtp@localhost:5432/vtp";

const client = postgres(connectionString, { max: 1, prepare: false });
const db = drizzle(client);

try {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully");
} finally {
  await client.end();
}
