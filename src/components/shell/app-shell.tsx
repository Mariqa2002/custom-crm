"use client";

import { CalendarCheck, FileText, Home, Plus, Table2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { useProfile } from "@/lib/queries/misc";
import { useRealtimeSync } from "@/lib/queries/search";
import type { ThemePref } from "@/lib/types";
import { useTheme } from "../theme";
import { cn } from "../ui/primitives";
import { ShellProvider, useShell } from "./shell-context";
import { Sidebar, isActivePath } from "./sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ShellProvider>
      <ThemeSync />
      <RealtimeSync />
      <a
        href="#main"
        className="sr-only z-[200] rounded-lg bg-accent px-4 py-2 font-bold text-on-accent focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <Sidebar />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-28 focus:outline-none md:pb-0">
          {children}
        </main>
      </div>
      <MobileTabBar />
    </ShellProvider>
  );
}

/** Applies the theme saved on the profile (e.g. chosen on another device). */
function ThemeSync() {
  const profile = useProfile().data;
  const { pref, applyTheme } = useTheme();
  const synced = useRef(false);
  useEffect(() => {
    if (!profile || synced.current) return;
    synced.current = true;
    const saved = profile.theme as ThemePref;
    if (saved !== pref) applyTheme(saved);
  }, [profile, pref, applyTheme]);
  return null;
}

function RealtimeSync() {
  useRealtimeSync();
  return null;
}

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/today", label: "Today", icon: CalendarCheck },
  null, // (+) Log update
  { href: "/register", label: "Register", icon: Table2 },
  { href: "/reports", label: "Reports", icon: FileText },
] as const;

function MobileTabBar() {
  const pathname = usePathname();
  const { openLogUpdate } = useShell();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) =>
          tab === null ? (
            <li key="log" className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => openLogUpdate()}
                aria-label="Log update"
                className="-mt-6 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-card"
              >
                <Plus size={26} aria-hidden />
              </button>
            </li>
          ) : (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActivePath(pathname, tab.href) ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                  isActivePath(pathname, tab.href) ? "text-accent-text" : "text-muted",
                )}
              >
                <tab.icon size={22} aria-hidden />
                {tab.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
