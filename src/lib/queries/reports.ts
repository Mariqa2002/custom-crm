"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import type { Json } from "../database.types";
import { todayISO } from "../dates";
import { assembleReport, reportTitle, type ReportContent } from "../report";
import { createClient } from "../supabase/client";
import type { Report } from "../types";
import {
  fetchPhases,
  fetchProfile,
  fetchProjects,
  fetchReports,
  fetchTasks,
  fetchUpdates,
  keys,
} from "./fetchers";
import { check, checkMaybe, errMessage } from "./shared";

export function useReports() {
  return useQuery({ queryKey: keys.reports, queryFn: () => fetchReports(createClient()) });
}

export function reportContent(r: Report): ReportContent {
  return r.content as unknown as ReportContent;
}

/** Generate (or regenerate) the draft for a week from fresh data. */
export function useGenerateReport() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ periodStart, periodEnd }: { periodStart: string; periodEnd: string }) => {
      const sb = createClient();
      // Always assemble from fresh data, not whatever is cached.
      const [profile, phases, tasks, projects, updates] = await Promise.all([
        qc.fetchQuery({ queryKey: keys.profile, queryFn: () => fetchProfile(sb), staleTime: 0 }),
        qc.fetchQuery({ queryKey: keys.phases, queryFn: () => fetchPhases(sb), staleTime: 0 }),
        qc.fetchQuery({ queryKey: keys.tasks, queryFn: () => fetchTasks(sb), staleTime: 0 }),
        qc.fetchQuery({ queryKey: keys.projects, queryFn: () => fetchProjects(sb), staleTime: 0 }),
        qc.fetchQuery({ queryKey: keys.updates, queryFn: () => fetchUpdates(sb), staleTime: 0 }),
      ]);
      const existing = checkMaybe(
        await sb
          .from("reports")
          .select("*")
          .eq("period_start", periodStart)
          .eq("status", "draft")
          .maybeSingle(),
      );
      const prevContent = existing ? reportContent(existing) : null;
      const content = assembleReport({
        profile,
        phases,
        tasks,
        projects,
        updates,
        periodStart,
        periodEnd,
        preparedOn: todayISO(),
        supportNeeded: prevContent?.supportNeeded ?? "",
        phasesRetired: !!profile?.phases_retired_at,
      });
      const payload = {
        period_start: periodStart,
        period_end: periodEnd,
        title: reportTitle(periodStart, periodEnd),
        content: content as unknown as NonNullable<Json>,
      };
      if (existing) {
        return check(await sb.from("reports").update(payload).eq("id", existing.id).select().single());
      }
      return check(await sb.from("reports").insert(payload).select().single());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.reports }),
    onError: (e) => toast({ tone: "error", message: `Couldn't generate the report: ${errMessage(e)}` }),
  });
}

/** Save her own text (summary, support needed) on a draft. */
export function useSaveReportText() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ report, summary, supportNeeded }: { report: Report; summary: string; supportNeeded: string }) => {
      const content = { ...reportContent(report), supportNeeded } as unknown as NonNullable<Json>;
      return check(
        await createClient()
          .from("reports")
          .update({ summary: summary.trim() || null, content })
          .eq("id", report.id)
          .select()
          .single(),
      );
    },
    onSuccess: (row) => {
      qc.setQueryData<Report[]>(keys.reports, (l) => l?.map((r) => (r.id === row.id ? row : r)));
    },
    onError: (e) => toast({ tone: "error", message: `Couldn't save: ${errMessage(e)}` }),
  });
}

export function useMarkSent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (report: Report) =>
      check(
        await createClient()
          .from("reports")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", report.id)
          .select()
          .single(),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.reports });
      toast({ tone: "success", message: "Marked as sent. This report is now read-only." });
    },
    onError: (e) => toast({ tone: "error", message: `Couldn't mark as sent: ${errMessage(e)}` }),
  });
}

/** Sent reports are read-only; duplicating makes an editable draft copy. */
export function useDuplicateReport() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (report: Report) => {
      const sb = createClient();
      const draft = checkMaybe(
        await sb.from("reports").select("id").eq("period_start", report.period_start).eq("status", "draft").maybeSingle(),
      );
      if (draft) throw new Error("There is already a draft for this week. Open it from the list.");
      return check(
        await sb
          .from("reports")
          .insert({
            period_start: report.period_start,
            period_end: report.period_end,
            title: report.title,
            summary: report.summary,
            content: report.content,
          })
          .select()
          .single(),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.reports }),
    onError: (e) => toast({ tone: "error", message: errMessage(e) }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("reports").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.reports }),
    onError: (e) => toast({ tone: "error", message: `Couldn't delete: ${errMessage(e)}` }),
  });
}
