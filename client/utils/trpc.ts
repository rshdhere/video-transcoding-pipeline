import { createTRPCContext } from "@trpc/tanstack-react-query"
import type { AppRouter } from "../../src/router.js";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

