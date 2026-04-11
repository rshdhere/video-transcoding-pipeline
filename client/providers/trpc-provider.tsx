"use client"

import { BACKEND_URL } from "@/config";
import React, { useState } from "react";
import { TRPCProvider } from "@/utils/trpc";
import { AppRouter } from "../../src/router";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";


export function TRPCProviders(
  { children }: { children: React.ReactNode }
) {
  const [queryClient] = useState(() => new QueryClient())
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url: BACKEND_URL!,
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
