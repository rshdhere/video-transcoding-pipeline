import type { Config } from "@vtp/config";
import { videos } from "@vtp/drizzle";
import { downloadVideoSchema } from "@vtp/validators";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

import type { Auth } from "./auth.ts";
import { getDb } from "./db.ts";
import {
  createRequireSession,
  type AuthenticatedRequest,
} from "./middleware/session.ts";
import {
  createVideoDownload,
  listVideoVariants,
  PipelineError,
} from "./services/pipeline.ts";

export function createDownloadHandler(auth: Auth, config: Config) {
  const requireSession = createRequireSession(auth);

  return [
    requireSession,
    async (req: Request, res: Response) => {
      const parsed = downloadVideoSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid request body",
          issues: parsed.error.issues,
        });
        return;
      }

      try {
        const { session } = req as AuthenticatedRequest;
        const result = await createVideoDownload(
          getDb(config),
          config,
          session.user.id,
          req.params.videoId!,
          parsed.data,
        );

        res.status(200).json(result);
      } catch (error) {
        handlePipelineError(res, error);
      }
    },
  ];
}

export function createVideoVariantsHandler(auth: Auth, config: Config) {
  const requireSession = createRequireSession(auth);

  return [
    requireSession,
    async (req: Request, res: Response) => {
      try {
        const { session } = req as AuthenticatedRequest;
        const db = getDb(config);
        const variants = await listVideoVariants(db, req.params.videoId!);

        const [video] = await db
          .select()
          .from(videos)
          .where(eq(videos.id, req.params.videoId!))
          .limit(1);

        if (!video) {
          res
            .status(404)
            .json({ error: "Video not found", code: "VIDEO_NOT_FOUND" });
          return;
        }

        if (video.userId !== session.user.id) {
          res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
          return;
        }

        res.status(200).json({ variants });
      } catch (error) {
        handlePipelineError(res, error);
      }
    },
  ];
}

function handlePipelineError(res: Response, error: unknown) {
  if (error instanceof PipelineError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }

  throw error;
}
