"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15 * 60 * 1000, // 15 minutes fresh RAM cache
            gcTime: 60 * 60 * 1000, // 60 minutes garbage collection time
            refetchOnWindowFocus: false, // Prevent refetching on tab focus
            refetchOnMount: false, // Prevent refetching when navigating back
            placeholderData: (previousData: any) => previousData, // Seamless tab transitions without black flicker
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
