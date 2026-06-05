import type { Request, Response } from "express";

import type { Auth } from "./auth.ts";

export function createMeHandler(auth: Auth) {
  return async (req: Request, res: Response) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json({
      user: session.user,
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
      },
    });
  };
}
