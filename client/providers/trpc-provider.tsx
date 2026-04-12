"use client"

import { BACKEND_URL } from "@/config";
import React, { useState } from "react";
import { TRPCProvider } from "@/utils/trpc";
import type { AppRouter } from "../../src/router.js";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


export function TRPCProviders(
  { children }: { children: React.ReactNode }
) {
  const trpcUrl = new URL("/trpc", BACKEND_URL).toString()
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: trpcUrl,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
