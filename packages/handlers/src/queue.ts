import type { Config } from "@vtp/config";
import { queuePopSchema, queuePushSchema } from "@vtp/validators";
import type { Request, Response } from "express";

import type { Auth } from "./auth.ts";
import { getDb } from "./db.ts";
import {
  createOptionalSession,
  createRequireSession,
  type AuthenticatedRequest,
} from "./middleware/session.ts";
import { PipelineError, popBackgroundJob, pushBackgroundJob } from "./services/pipeline.ts";

export function createQueuePushHandler(auth: Auth, config: Config) {
  const optionalSession = createOptionalSession(auth);

  return [
    optionalSession,
    async (req: Request, res: Response) => {
      const parsed = queuePushSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid request body",
          issues: parsed.error.issues,
        });
        return;
      }

      const session = (req as AuthenticatedRequest).session;

      if (parsed.data.type === "transcoding" && !session) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (parsed.data.type === "email_verification" && !session) {
        try {
          const job = await pushBackgroundJob(getDb(config), config, {
            ...parsed.data,
          });
          res.status(201).json({ job });
        } catch (error) {
          handlePipelineError(res, error);
        }
        return;
      }

      try {
        const job = await pushBackgroundJob(getDb(config), config, {
          ...parsed.data,
          userId: session!.user.id,
        });
        res.status(201).json({ job });
      } catch (error) {
        handlePipelineError(res, error);
      }
    },
  ];
}

export function createQueuePopHandler(auth: Auth, config: Config) {
  const requireSession = createRequireSession(auth);

  return [
    requireSession,
    async (req: Request, res: Response) => {
      const parsed = queuePopSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid request body",
          issues: parsed.error.issues,
        });
        return;
      }

      if (parsed.data.type === "transcoding") {
        try {
          const { session } = req as AuthenticatedRequest;
          const job = await popBackgroundJob(
            getDb(config),
            parsed.data.type,
            session.user.id,
            session.user.id,
          );

          if (!job) {
            res.status(204).send();
            return;
          }

          res.status(200).json({ job });
        } catch (error) {
          handlePipelineError(res, error);
        }
        return;
      }

      res.status(403).json({
        error: "Only authenticated users may pop transcoding jobs",
        code: "FORBIDDEN",
      });
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
