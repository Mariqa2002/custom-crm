"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type { ThemePref } from "@/lib/types";
import { ThemeProvider } from "./theme";
import { ToastProvider } from "./ui/toast";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true, // keeps laptop, desktop and phone in step
        retry: 1,
      },
    },
  });
}

export function Providers({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: ThemePref;
}) {
  const [client] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider initialTheme={initialTheme}>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
