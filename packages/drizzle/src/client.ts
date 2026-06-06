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

export async function verifyDbSchema(connectionString: string) {
  const client = postgres(connectionString, { max: 1, prepare: false });

  try {
    const [result] = await client<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'user'
      ) AS exists
    `;

    if (!result?.exists) {
      throw new Error(
        'Database schema is missing. Run "bun run db:migrate" from the repo root.',
      );
    }
  } finally {
    await client.end();
  }
}
