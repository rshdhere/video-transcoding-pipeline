import type { NextFunction, Request, Response } from "express";

import type { Auth } from "../auth.ts";

export type SessionData = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>;

export type AuthenticatedRequest = Request & {
  session: SessionData;
};

export function createRequireSession(auth: Auth) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    (req as AuthenticatedRequest).session = session;
    next();
  };
}

export function createOptionalSession(auth: Auth) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (session) {
      (req as AuthenticatedRequest).session = session;
    }

    next();
  };
}
