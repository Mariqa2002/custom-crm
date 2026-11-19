"use client";

import { ErrorState } from "@/components/ui/primitives";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="p-4 md:p-8">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface">
        <ErrorState message={error.message || "Something went wrong loading this page."} onRetry={reset} />
      </div>
    </div>
  );
}
