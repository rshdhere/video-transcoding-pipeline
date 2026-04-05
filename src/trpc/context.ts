import * as trpcExpress from "@trpc/server/adapters/express";
import { auth } from "../auth/auth.js";

export async function createContext({
  req,
  res,
}: trpcExpress.CreateExpressContextOptions) {
  const session = await auth.api.getSession({
    headers: new Headers(req.headers as Record<string, string>),
  });

  return {
    session,
    user: session?.user ?? null,
    res,
  };
}
