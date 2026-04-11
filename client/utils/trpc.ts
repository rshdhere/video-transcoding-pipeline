import { createTRPCContext } from "@trpc/tanstack-react-query"
import type { AppRouter } from '../../src/router.ts';

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

