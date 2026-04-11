import cors from "cors"
import express from "express"
import { router } from "./trpc.js";
import { auth } from "./auth/auth.js";
import { toNodeHandler } from "better-auth/node";
import { userRouter } from "./routes/v1/user.js";
import { createContext } from "./trpc/context.js";
import { FRONTEND_URL } from "./config/config.js";
import { videoRouter } from "./routes/v1/video.js";
import * as trpcExpress from "@trpc/server/adapters/express"

export const appRouter = router({
  v1: router({
    user: userRouter,
    video: videoRouter
  }),
})

export type AppRouter = typeof appRouter;

export const app = express();

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}))

app.use("/trpc", trpcExpress.createExpressMiddleware({
  router: appRouter,
  createContext
}))

app.use("/api/auth/", toNodeHandler(auth));
