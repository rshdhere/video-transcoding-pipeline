import express from "express"
import { router } from "./trpc.js";
import { userRouter } from "./routes/v1/user.js";
import * as trpcExpress from "@trpc/server/adapters/express"
import { createContext } from "./trpc/context.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth.js";
import { videoRouter } from "./routes/v1/video.js";

export const appRouter = router({
  v1: router({
    user: userRouter,
    video: videoRouter
  }),
})

export type AppRouter = typeof appRouter;

export const app = express();

app.use("/trpc", trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext
}))

app.use("/api/auth/", toNodeHandler(auth));
