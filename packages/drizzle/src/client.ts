import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index.ts";

export function createDb(connectionString: string) {
  const client = postgres(connectionString, { prepare: false });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

export async function verifyDbConnection(connectionString: string) {
  const client = postgres(connectionString, { max: 1, prepare: false });

  try {
    await client`SELECT 1`;
  } finally {
    await client.end();
  }
}
