import type { Config } from "@vtp/config";
import { importYouTubeVideoSchema } from "@vtp/validators";
import type { Request, Response } from "express";

import type { Auth } from "./auth.ts";
import { getDb } from "./db.ts";
import {
  createRequireSession,
  type AuthenticatedRequest,
} from "./middleware/session.ts";
import { handlePipelineError } from "./errors.ts";
import { createYouTubeImport } from "./services/pipeline.ts";

export function createImportYouTubeHandler(auth: Auth, config: Config) {
  const requireSession = createRequireSession(auth);

  return [
    requireSession,
    async (req: Request, res: Response) => {
      const parsed = importYouTubeVideoSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid request body",
          issues: parsed.error.issues,
        });
        return;
      }

      try {
        const { session } = req as AuthenticatedRequest;
        const result = await createYouTubeImport(
          getDb(config),
          config,
          session.user.id,
          parsed.data,
        );

        res.status(201).json(result);
      } catch (error) {
        handlePipelineError(res, error);
      }
    },
  ];
}
