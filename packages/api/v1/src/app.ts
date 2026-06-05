import type { Config } from "@vtp/config";
import { createAuth } from "@vtp/handlers";
import express from "express";

import { registerAuthRoutes } from "./routes/auth.ts";
import { registerApiRoutes } from "./routes/index.ts";

export function createApp(config: Config) {
  const auth = createAuth(config);
  const app = express();

  registerAuthRoutes(app, auth);

  app.use(express.json());

  registerApiRoutes(app, { auth, config });

  return { app, auth };
}
