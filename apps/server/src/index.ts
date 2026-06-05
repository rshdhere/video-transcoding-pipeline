import { startServer } from "@vtp/api-v1";
import { loadConfig } from "@vtp/config";

const config = loadConfig();

startServer(config);
