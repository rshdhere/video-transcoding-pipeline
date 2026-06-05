import { startServer } from "@vtp/api-v1";
import { loadConfig } from "@vtp/config";
import { verifyDbConnection } from "@vtp/drizzle";

export async function run() {
  const config = loadConfig();

  await verifyDbConnection(config.DATABASE_URL);

  startServer(config);
}

if (import.meta.main) {
  run().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
