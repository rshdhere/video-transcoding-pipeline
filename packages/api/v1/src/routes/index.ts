import type { Express } from "express";

import { registerHealthRoutes } from "./health.ts";
import { registerMeRoutes } from "./me.ts";
import { registerQueueRoutes } from "./queue.ts";
import type { RouteDeps } from "./types.ts";
import { registerVideoRoutes } from "./videos.ts";
import { registerWorkerRoutes } from "./workers.ts";

export function registerApiRoutes(app: Express, deps: RouteDeps) {
  registerHealthRoutes(app);
  registerMeRoutes(app, deps);
  registerVideoRoutes(app, deps);
  registerQueueRoutes(app, deps);
  registerWorkerRoutes(app, deps);
}

export type { RouteDeps } from "./types.ts";
