"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "../supabase/client";
import { keys } from "./fetchers";
import { check } from "./shared";

/** Escape LIKE wildcards so the user's text is matched literally. */
export function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function useSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: keys.search(term),
    enabled: term.length >= 2,
    staleTime: 10_000,
    queryFn: async () => {
      const sb = createClient();
      const p = likePattern(term);
      const [tasks, projects, updates] = await Promise.all([
        sb.from("tasks").select("id,title,phase_id,project_id,status").ilike("title", p).limit(8),
        sb.from("projects").select("id,name,color").ilike("name", p).limit(8),
        sb.from("updates").select("id,body,happened_on,project_id").ilike("body", p).limit(8),
      ]);
      return { tasks: check(tasks), projects: check(projects), updates: check(updates) };
    },
  });
}

/** Stretch goal: Realtime keeps devices in sync without waiting for focus. */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel("tracker-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        void qc.invalidateQueries({ queryKey: keys.tasks });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "updates" }, () => {
        void qc.invalidateQueries({ queryKey: keys.updates });
      })
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [qc]);
}
