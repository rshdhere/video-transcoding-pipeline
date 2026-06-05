import { createQueuePopHandler, createQueuePushHandler } from "@vtp/handlers";
import type { Express } from "express";

import type { RouteDeps } from "./types.ts";

export function registerQueueRoutes(app: Express, deps: RouteDeps) {
  const { auth, config } = deps;

  app.post("/api/v1/queue/push", ...createQueuePushHandler(auth, config));
  app.post("/api/v1/queue/pop", ...createQueuePopHandler(auth, config));
}
