import type { Config } from "@vtp/config";
import type { Request, Response } from "express";

import type { Auth } from "./auth.ts";
import { getDb } from "./db.ts";
import {
  createRequireSession,
  type AuthenticatedRequest,
} from "./middleware/session.ts";
import { handlePipelineError } from "./errors.ts";
import { confirmVideoUpload } from "./services/pipeline.ts";

export function createConfirmUploadHandler(auth: Auth, config: Config) {
  const requireSession = createRequireSession(auth);

  return [
    requireSession,
    async (req: Request, res: Response) => {
      const videoId = req.params.videoId;

      if (!videoId) {
        res.status(400).json({ error: "Video ID is required" });
        return;
      }

      try {
        const { session } = req as AuthenticatedRequest;
        const result = await confirmVideoUpload(
          getDb(config),
          config,
          session.user.id,
          videoId,
        );

        res.status(200).json(result);
      } catch (error) {
        handlePipelineError(res, error);
      }
    },
  ];
}
