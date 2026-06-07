import {
  createConfirmUploadHandler,
  createDownloadHandler,
  createImportYouTubeHandler,
  createListVideosHandler,
  createUploadHandler,
  createVideoVariantsHandler,
} from "@vtp/handlers";
import type { Express } from "express";

import type { RouteDeps } from "./types.ts";

export function registerVideoRoutes(app: Express, deps: RouteDeps) {
  const { auth, config } = deps;

  app.get("/api/v1/videos", ...createListVideosHandler(auth, config));
  app.post("/api/v1/videos/upload", ...createUploadHandler(auth, config));
  app.post("/api/v1/videos/import", ...createImportYouTubeHandler(auth, config));
  app.post(
    "/api/v1/videos/:videoId/confirm-upload",
    ...createConfirmUploadHandler(auth, config),
  );
  app.post(
    "/api/v1/videos/:videoId/download",
    ...createDownloadHandler(auth, config),
  );
  app.get(
    "/api/v1/videos/:videoId/variants",
    ...createVideoVariantsHandler(auth, config),
  );
}
