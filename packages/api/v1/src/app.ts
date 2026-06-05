import type { Config } from "@vtp/config";
import {
  createAuth,
  createMeHandler,
  healthHandler,
} from "@vtp/handlers";
import { toNodeHandler } from "better-auth/node";
import express from "express";

export function createApp(config: Config) {
  const auth = createAuth(config);
  const app = express();

  app.all("/api/v1/auth/*", toNodeHandler(auth));

  app.use(express.json());

  app.get("/health", healthHandler);
  app.get("/api/v1/me", createMeHandler(auth));

  return { app, auth };
}
