import type { Config } from "@vtp/config";
import { createDb, type Database } from "@vtp/drizzle";

let db: Database | undefined;

export function getDb(config: Config): Database {
  if (!db) {
    db = createDb(config.DATABASE_URL);
  }

  return db;
}
