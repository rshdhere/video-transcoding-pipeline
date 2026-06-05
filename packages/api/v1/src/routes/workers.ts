import {
  createWorkerProcessHandler,
  createWorkerShutdownHandler,
} from "@vtp/handlers";
import type { Express } from "express";

import type { RouteDeps } from "./types.ts";

export function registerWorkerRoutes(app: Express, deps: RouteDeps) {
  const { auth, config } = deps;

  app.post(
    "/api/v1/workers/process",
    ...createWorkerProcessHandler(auth, config),
  );
  app.post(
    "/api/v1/workers/shutdown",
    ...createWorkerShutdownHandler(auth, config),
  );
}
