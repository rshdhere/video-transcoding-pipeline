import type { Config } from "@vtp/config";
import { videos } from "@vtp/drizzle";
import { desc, eq } from "drizzle-orm";
import type { Request, Response } from "express";

import type { Auth } from "./auth.ts";
import { getDb } from "./db.ts";
import {
  createRequireSession,
  type AuthenticatedRequest,
} from "./middleware/session.ts";
import { handlePipelineError } from "./errors.ts";

export function createListVideosHandler(auth: Auth, config: Config) {
  const requireSession = createRequireSession(auth);

  return [
    requireSession,
    async (req: Request, res: Response) => {
      try {
        const { session } = req as AuthenticatedRequest;
        const db = getDb(config);
        const items = await db
          .select()
          .from(videos)
          .where(eq(videos.userId, session.user.id))
          .orderBy(desc(videos.createdAt));

        res.status(200).json({ videos: items });
      } catch (error) {
        handlePipelineError(res, error);
      }
    },
  ];
}
