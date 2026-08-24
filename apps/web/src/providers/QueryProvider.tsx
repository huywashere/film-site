"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 60 * 1000, // Keep catalog data fresh across route/tab changes
            gcTime: 2 * 60 * 60 * 1000,
            refetchOnWindowFocus: false, // Prevent refetching on tab focus
            refetchOnReconnect: false,
            refetchOnMount: false, // Prevent refetching when navigating back
            placeholderData: (previousData: any) => previousData, // Seamless tab transitions without black flicker
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
