import type { Config } from "@vtp/config";
import { workerProcessSchema } from "@vtp/validators";
import type { Request, Response } from "express";

import type { Auth } from "./auth.ts";
import { getDb } from "./db.ts";
import {
  createOptionalSession,
  createRequireSession,
  type AuthenticatedRequest,
} from "./middleware/session.ts";
import {
  processEmailVerificationJob,
  processTranscodingJob,
} from "./services/pipeline.ts";
import {
  beginWorkerPoll,
  endWorkerPoll,
  getWorkerRuntime,
  shutdownWorker,
} from "./services/worker-runtime.ts";

export function createWorkerProcessHandler(auth: Auth, config: Config) {
  const optionalSession = createOptionalSession(auth);

  return [
    optionalSession,
    async (req: Request, res: Response) => {
      const parsed = workerProcessSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid request body",
          issues: parsed.error.issues,
        });
        return;
      }

      const session = (req as AuthenticatedRequest).session;

      if (parsed.data.type === "transcoding") {
        if (!session) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        const poll = beginWorkerPoll("transcoding");

        if (!poll.allowed) {
          res.status(503).json({
            error: "Transcoding worker is unavailable",
            code: poll.reason,
          });
          return;
        }

        try {
          const result = await processTranscodingJob(
            getDb(config),
            config,
            session.user.id,
          );
          res.status(200).json(result);
        } finally {
          endWorkerPoll("transcoding");
        }

        return;
      }

      const poll = beginWorkerPoll("email_verification");

      if (!poll.allowed) {
        res.status(503).json({
          error: "Email verification worker is unavailable",
          code: poll.reason,
        });
        return;
      }

      try {
        const result = await processEmailVerificationJob(
          getDb(config),
          poll.workerId,
        );
        res.status(200).json(result);
      } finally {
        endWorkerPoll("email_verification");
      }
    },
  ];
}

export function createWorkerShutdownHandler(auth: Auth, config: Config) {
  const requireSession = createRequireSession(auth);

  return [
    requireSession,
    async (req: Request, res: Response) => {
      const parsed = workerProcessSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Invalid request body",
          issues: parsed.error.issues,
        });
        return;
      }

      shutdownWorker(parsed.data.type);
      res.status(200).json({
        success: true,
        runtime: getWorkerRuntime(parsed.data.type),
      });
    },
  ];
}
