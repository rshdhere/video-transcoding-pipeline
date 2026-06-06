import { startServer } from "@vtp/api-v1";
import { loadConfig } from "@vtp/config";
import { verifyDbConnection, verifyDbSchema } from "@vtp/drizzle";

export function main() {
  void bootstrap().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

async function bootstrap() {
  const config = loadConfig();

  await verifyDbConnection(config.DATABASE_URL);
  await verifyDbSchema(config.DATABASE_URL);

  startServer(config);
}
