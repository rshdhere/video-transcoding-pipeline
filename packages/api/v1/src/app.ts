import type { Config } from "@vtp/config";
import {
  createAuth,
  createDownloadHandler,
  createMeHandler,
  createQueuePopHandler,
  createQueuePushHandler,
  createUploadHandler,
  createVideoVariantsHandler,
  createWorkerProcessHandler,
  createWorkerShutdownHandler,
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

  app.post("/api/v1/videos/upload", ...createUploadHandler(auth, config));
  app.post(
    "/api/v1/videos/:videoId/download",
    ...createDownloadHandler(auth, config),
  );
  app.get(
    "/api/v1/videos/:videoId/variants",
    ...createVideoVariantsHandler(auth, config),
  );

  app.post("/api/v1/queue/push", ...createQueuePushHandler(auth, config));
  app.post("/api/v1/queue/pop", ...createQueuePopHandler(auth, config));

  app.post(
    "/api/v1/workers/process",
    ...createWorkerProcessHandler(auth, config),
  );
  app.post(
    "/api/v1/workers/shutdown",
    ...createWorkerShutdownHandler(auth, config),
  );

  return { app, auth };
}
