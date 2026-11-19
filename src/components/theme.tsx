"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { setThemeCookie } from "@/app/actions";
import type { ThemePref } from "@/lib/types";

type ThemeCtx = {
  pref: ThemePref;
  isDark: boolean;
  /** Applies locally and mirrors to the cookie. Saving to the profile is done by the caller. */
  applyTheme: (pref: ThemePref) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

function subscribeOS(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: ThemePref;
}) {
  const [pref, setPref] = useState<ThemePref>(initialTheme);
  const osDark = useSyncExternalStore(
    subscribeOS,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );

  useEffect(() => {
    const root = document.documentElement;
    if (pref === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", pref);
  }, [pref]);

  const applyTheme = useCallback((next: ThemePref) => {
    setPref((current) => {
      if (current !== next) void setThemeCookie(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ pref, isDark: pref === "dark" || (pref === "system" && osDark), applyTheme }),
    [pref, osDark, applyTheme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
