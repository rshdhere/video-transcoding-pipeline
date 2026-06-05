import { healthHandler } from "@vtp/handlers";
import type { Express } from "express";

export function registerHealthRoutes(app: Express) {
  app.get("/health", healthHandler);
}
