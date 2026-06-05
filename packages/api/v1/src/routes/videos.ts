import {
  createDownloadHandler,
  createUploadHandler,
  createVideoVariantsHandler,
} from "@vtp/handlers";
import type { Express } from "express";

import type { RouteDeps } from "./types.ts";

export function registerVideoRoutes(app: Express, deps: RouteDeps) {
  const { auth, config } = deps;

  app.post("/api/v1/videos/upload", ...createUploadHandler(auth, config));
  app.post(
    "/api/v1/videos/:videoId/download",
    ...createDownloadHandler(auth, config),
  );
  app.get(
    "/api/v1/videos/:videoId/variants",
    ...createVideoVariantsHandler(auth, config),
  );
}
