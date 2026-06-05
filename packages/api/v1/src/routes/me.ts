import { createMeHandler } from "@vtp/handlers";
import type { Express } from "express";

import type { RouteDeps } from "./types.ts";

export function registerMeRoutes(app: Express, { auth }: RouteDeps) {
  app.get("/api/v1/me", createMeHandler(auth));
}
