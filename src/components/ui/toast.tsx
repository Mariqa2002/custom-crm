"use client";

import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type Toast = {
  id: number;
  message: string;
  tone: "info" | "error" | "success";
  action?: { label: string; onClick: () => void };
  duration: number;
};

type ToastInput = Omit<Toast, "id" | "duration" | "tone"> & {
  tone?: Toast["tone"];
  duration?: number;
};

const Ctx = createContext<{ toast: (t: ToastInput) => number; dismiss: (id: number) => void } | null>(
  null,
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const t: Toast = { tone: "info", duration: 5000, ...input, id };
      setToasts((ts) => [...ts.slice(-3), t]);
      window.setTimeout(() => dismiss(id), t.duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-card ${
              t.tone === "error"
                ? "border-orange-text/30 bg-orange-soft text-orange-text"
                : "border-border bg-surface text-text"
            }`}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="min-h-11 rounded-lg px-3 font-bold text-accent-text hover:bg-accent-soft"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              className="grid size-11 place-items-center rounded-lg text-muted hover:bg-surface-2"
              onClick={() => dismiss(t.id)}
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
