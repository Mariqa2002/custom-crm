"use client";

import {
  CalendarCheck,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Flag,
  LayoutDashboard,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Settings,
  SquarePen,
  Sun,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { todayISO } from "@/lib/dates";
import { usePhasesRetired, useProfile, useUpdateProfile } from "@/lib/queries/misc";
import { useActiveProjects } from "@/lib/queries/projects";
import { useToday } from "@/lib/queries/tasks";
import { useLocalPref, useMediaQuery } from "@/lib/use-local-pref";
import { useTheme } from "../theme";
import { cn } from "../ui/primitives";
import { useShell } from "./shell-context";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: CalendarCheck },
  { href: "/phases", label: "Phases", icon: Flag },
  { href: "/register", label: "Assignment Register", icon: Table2 },
  { href: "/notes", label: "Updates & Notes", icon: NotebookPen },
  { href: "/reports", label: "Reports", icon: FileText },
] as const;

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase() || "WD";
}

export function Sidebar() {
  const pathname = usePathname();
  const { openLogUpdate, openAddProject, openSettings } = useShell();
  const retired = usePhasesRetired();
  const nav = NAV.filter((n) => !(retired && n.href === "/phases"));
  const [pref, setPref] = useLocalPref<"collapsed" | "expanded">("tt.sidebar");
  const isXl = useMediaQuery("(min-width: 1280px)");
  const collapsed = pref ? pref === "collapsed" : !isXl;
  const state = pref ?? "auto";
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);

  // Collapsed rail: show the item's name beside it. Hover and keyboard focus both work.
  const showTip = (e: SyntheticEvent) => {
    const el = collapsed ? (e.target as HTMLElement).closest<HTMLElement>("[data-tip]") : null;
    if (!el?.dataset.tip) return setTip(null);
    const r = el.getBoundingClientRect();
    setTip({ text: el.dataset.tip, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hideTip = () => setTip(null);

  const { groups } = useToday(todayISO());
  const projects = useActiveProjects().data ?? [];
  const profile = useProfile().data;
  const updateProfile = useUpdateProfile();
  const { isDark, applyTheme } = useTheme();

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    updateProfile.mutate({ theme: next });
  };

  return (
    <aside
      data-state={state}
      aria-label="Main"
      onMouseOver={showTip}
      onFocus={showTip}
      onMouseLeave={hideTip}
      onBlur={hideTip}
      className="sidebar sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex"
    >
      {/* Logo + collapse */}
      <div className="flex h-[72px] items-center gap-2 px-5">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-sm font-extrabold text-on-accent"
        >
          TT
        </span>
        <span className="sb-label min-w-0 flex-1 leading-tight">
          <span className="block text-[15px] font-extrabold">Transition</span>
          <span className="block text-xs font-semibold text-muted">Tracker</span>
        </span>
        <button
          type="button"
          onClick={() => setPref(collapsed ? "expanded" : "collapsed")}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="sb-label grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
        >
          <ChevronsLeft size={18} aria-hidden />
        </button>
      </div>
      <div className="sb-only-collapsed justify-center pb-1">
        <button
          type="button"
          onClick={() => setPref("expanded")}
          aria-expanded={false}
          aria-label="Expand sidebar"
          data-tip="Expand sidebar"
          className="sb-tip grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
        >
          <ChevronsRight size={18} aria-hidden />
        </button>
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => openLogUpdate()}
          aria-label="Log update"
          data-tip="Log update"
          className="sb-tip flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-bold text-on-accent hover:brightness-110"
        >
          <SquarePen size={18} aria-hidden />
          <span className="sb-label">Log update</span>
        </button>
      </div>

      <nav aria-label="Primary" onScroll={hideTip} className="flex-1 overflow-y-auto px-4">
        <ul className="flex flex-col gap-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            const count = href === "/today" ? groups.openCount : 0;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={count ? `${label}, ${count} open tasks` : label}
                  data-tip={label}
                  className={cn(
                    "sb-tip flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                    active ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-surface-2 hover:text-text",
                  )}
                >
                  <span className="relative">
                    <Icon size={20} aria-hidden />
                    {count > 0 && (
                      <span className="sb-only-collapsed absolute -top-1.5 -right-2 min-w-4 justify-center rounded-full bg-accent px-1 text-[10px] leading-4 font-bold text-on-accent">
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="sb-label flex-1 truncate">{label}</span>
                  {count > 0 && (
                    <span className="sb-label rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          <h2 className="sb-label px-3 pb-2 text-[11px] font-bold tracking-wider text-muted uppercase">
            Projects
          </h2>
          <ul className="flex flex-col gap-1">
            {projects.map((p) => {
              const href = `/projects/${p.id}`;
              const active = pathname === href;
              return (
                <li key={p.id}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    aria-label={p.name}
                    data-tip={p.name}
                    className={cn(
                      "sb-tip flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                      active ? "bg-accent-soft text-accent-text" : "text-muted hover:bg-surface-2 hover:text-text",
                    )}
                  >
                    <span aria-hidden className="mx-[3px] size-3.5 shrink-0 rounded" style={{ background: p.color }} />
                    <span className="sb-label truncate">{p.name}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={openAddProject}
                aria-label="Add project"
                data-tip="Add project"
                className="sb-tip flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text"
              >
                <Plus size={20} aria-hidden />
                <span className="sb-label">Add project</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="flex flex-col gap-1 border-t border-line px-4 py-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-pressed={isDark}
          aria-label="Dark mode"
          data-tip="Dark mode"
          className="sb-tip flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text"
        >
          {isDark ? <Moon size={20} aria-hidden /> : <Sun size={20} aria-hidden />}
          <span className="sb-label flex-1 text-left">Dark mode</span>
          <span
            aria-hidden
            className={cn(
              "sb-label relative h-6 w-10 rounded-full transition",
              isDark ? "bg-accent" : "bg-border",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white transition-all",
                isDark ? "left-[18px]" : "left-0.5",
              )}
            />
          </span>
        </button>

        <div className="sb-label">
        <div className="flex items-center gap-3 rounded-xl px-2 py-1">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-bold text-accent-text"
          >
            {initials(profile?.full_name ?? "")}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold">{profile?.full_name || "Your name"}</span>
            <span className="block truncate text-xs text-muted">{profile?.job_title ?? "Web Developer"}</span>
          </span>
          <button
            type="button"
            onClick={openSettings}
            aria-label="Settings"
            title="Settings"
            className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
          >
            <MoreHorizontal size={20} aria-hidden />
          </button>
        </div>
        </div>
        <button
          type="button"
          onClick={openSettings}
          aria-label="Settings"
          data-tip="Settings"
          className="sb-tip sb-only-collapsed h-11 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
        >
          <Settings size={20} aria-hidden />
        </button>
      </div>
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[60] -translate-y-1/2 rounded-lg bg-text px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-surface"
          style={{ top: tip.top, left: tip.left }}
        >
          {tip.text}
        </div>
      )}
    </aside>
  );
}
