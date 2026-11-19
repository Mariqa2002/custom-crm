"use client";

import { Search, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePhasesRetired } from "@/lib/queries/misc";
import { useSearch } from "@/lib/queries/search";
import { cn } from "../ui/primitives";
import { useShell } from "./shell-context";

export function PageHeader({
  title,
  sub,
  actions,
  search = true,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  search?: boolean;
}) {
  const { openSettings } = useShell();
  return (
    <header className="flex flex-col gap-4 px-4 pt-5 pb-2 md:px-8 md:pt-7 lg:flex-row lg:items-center xl:px-9">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px]">{title}</h1>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        <button
          type="button"
          onClick={openSettings}
          aria-label="Settings"
          className="grid size-11 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface md:hidden"
        >
          <Settings size={20} aria-hidden />
        </button>
      </div>
      {(search || actions) && (
        <div className="flex flex-wrap items-center gap-2">
          {search && <SearchBox />}
          {actions}
        </div>
      )}
    </header>
  );
}

function SearchBox() {
  const id = useId();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { data, isFetching } = useSearch(debounced);
  const retired = usePhasesRetired();

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q), 250);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const showPanel = open && debounced.trim().length >= 2;
  const total = (data?.tasks.length ?? 0) + (data?.projects.length ?? 0) + (data?.updates.length ?? 0);

  return (
    <div ref={wrap} className="relative w-full sm:w-72" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <label htmlFor={`${id}-q`} className="sr-only">
        Search tasks, projects and updates
      </label>
      <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input
        id={`${id}-q`}
        type="search"
        value={q}
        placeholder="Search tasks, projects, updates"
        autoComplete="off"
        aria-controls={`${id}-results`}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        className="h-11 w-full rounded-xl border border-border bg-surface pr-3 pl-9 text-sm placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {showPanel && (
        <div
          id={`${id}-results`}
          className="absolute right-0 left-0 z-50 mt-1 max-h-[60dvh] overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-card"
        >
          <p className="sr-only" aria-live="polite">
            {isFetching ? "Searching" : `${total} results`}
          </p>
          {!isFetching && total === 0 && <p className="px-3 py-4 text-sm text-muted">No matches.</p>}
          <ResultGroup title="Tasks">
            {data?.tasks.map((t) => (
              <ResultLink
                key={t.id}
                href={t.project_id ? `/projects/${t.project_id}` : t.phase_id && !retired ? "/phases" : "/today"}
                onPick={() => setOpen(false)}
              >
                <span className={cn(t.status === "done" && "line-through")}>{t.title}</span>
              </ResultLink>
            ))}
          </ResultGroup>
          <ResultGroup title="Projects">
            {data?.projects.map((p) => (
              <ResultLink key={p.id} href={`/projects/${p.id}`} onPick={() => setOpen(false)}>
                <span aria-hidden className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: p.color }} />
                {p.name}
              </ResultLink>
            ))}
          </ResultGroup>
          <ResultGroup title="Updates">
            {data?.updates.map((u) => (
              <ResultLink
                key={u.id}
                href={u.project_id ? `/projects/${u.project_id}` : "/notes"}
                onPick={() => setOpen(false)}
              >
                <span className="line-clamp-2">{u.body}</span>
              </ResultLink>
            ))}
          </ResultGroup>
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  if (!items.filter(Boolean).length) return null;
  return (
    <div className="py-1">
      <p className="px-3 py-1 text-[11px] font-bold tracking-wider text-muted uppercase">{title}</p>
      <ul>{children}</ul>
    </div>
  );
}

function ResultLink({ href, children, onPick }: { href: string; children: ReactNode; onPick: () => void }) {
  return (
    <li>
      <Link
        href={href}
        onClick={onPick}
        className="flex min-h-11 items-center rounded-lg px-3 py-2 text-sm hover:bg-surface-2"
      >
        {children}
      </Link>
    </li>
  );
}
