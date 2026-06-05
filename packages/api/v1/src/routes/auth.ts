import type { Auth } from "@vtp/handlers";
import { toNodeHandler } from "better-auth/node";
import type { Express } from "express";

export function registerAuthRoutes(app: Express, auth: Auth) {
  app.all("/api/v1/auth/*", toNodeHandler(auth));
}
