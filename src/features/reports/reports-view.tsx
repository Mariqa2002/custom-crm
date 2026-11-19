"use client";

import { Copy, Download, FileText, RefreshCw, Send, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PageBody } from "@/components/shell/page-layout";
import { useToast } from "@/components/ui/toast";
import { Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, Pill, Select, Skeleton, Textarea, cn } from "@/components/ui/primitives";
import { addDaysISO, fmt, todayISO, weekFriday, weekMonday } from "@/lib/dates";
import { useProfile } from "@/lib/queries/misc";
import {
  reportContent,
  useDeleteReport,
  useDuplicateReport,
  useGenerateReport,
  useMarkSent,
  useReports,
  useSaveReportText,
} from "@/lib/queries/reports";
import { errMessage } from "@/lib/queries/shared";
import { reportFileName } from "@/lib/report";
import type { Report } from "@/lib/types";
import { ReportPreview } from "./report-preview";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ReportsView({ autoGenerate }: { autoGenerate: boolean }) {
  const id = useId();
  const today = todayISO();
  const profile = useProfile().data;
  const reportsQ = useReports();
  const generate = useGenerateReport();
  const [weekStart, setWeekStart] = useState(weekMonday(today));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const autoRan = useRef(false);

  const weeks = useMemo(() => {
    const first = weekMonday(profile?.transition_start ?? "2026-11-16");
    const list: string[] = [];
    for (let m = weekMonday(today); m >= first && list.length < 60; m = addDaysISO(m, -7)) list.push(m);
    if (!list.length) list.push(weekMonday(today));
    return list;
  }, [profile?.transition_start, today]);

  const reports = reportsQ.data ?? [];
  const thisMonday = weekMonday(today);
  const sentThisWeek = reports.find((r) => r.period_start === thisMonday && r.status === "sent");
  // Arriving from "Generate report" when this week is already sent: show that report.
  const effectiveId = selectedId ?? (autoGenerate ? (sentThisWeek?.id ?? null) : null);
  const selected = reports.find((r) => r.id === effectiveId) ?? null;

  const run = (monday: string) =>
    generate.mutate(
      { periodStart: monday, periodEnd: weekFriday(monday) },
      { onSuccess: (r) => setSelectedId(r.id) },
    );

  // One click from the Dashboard: generate this week's report on arrival.
  useEffect(() => {
    if (autoGenerate && !autoRan.current && reportsQ.isSuccess) {
      autoRan.current = true;
      if (!sentThisWeek) run(thisMonday);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, reportsQ.isSuccess]);

  return (
    <>
      <PageHeader title="Reports" sub="Weekly progress reports for the e-Government Coordinator" search={false} />
      <PageBody>
        <Card>
          <CardHeader icon={<FileText size={18} />} title="Generate a weekly report" sub="Builds a draft from that week's tasks, register changes and updates" />
          <div className="flex flex-col gap-3 px-5 pb-5 sm:flex-row sm:items-end">
            <Field label="Reporting week (Mon–Fri)" htmlFor={`${id}-week`} className="sm:w-80">
              <Select id={`${id}-week`} value={weekStart} onChange={(e) => setWeekStart(e.target.value)}>
                {weeks.map((m) => (
                  <option key={m} value={m}>
                    {fmt(m, "MMM d")} – {fmt(weekFriday(m), "MMM d, yyyy")}
                    {m === weekMonday(today) ? " (this week)" : ""}
                  </option>
                ))}
                {!weeks.includes(weekStart) && (
                  <option value={weekStart}>
                    {fmt(weekStart, "MMM d")} – {fmt(weekFriday(weekStart), "MMM d, yyyy")}
                  </option>
                )}
              </Select>
            </Field>
            <Field label="…or any date in the week" htmlFor={`${id}-date`} className="sm:w-48">
              <Input
                id={`${id}-date`}
                type="date"
                max={today}
                onChange={(e) => e.target.value && setWeekStart(weekMonday(e.target.value))}
              />
            </Field>
            <Button variant="primary" onClick={() => run(weekStart)} disabled={generate.isPending}>
              <RefreshCw size={16} aria-hidden className={cn(generate.isPending && "animate-spin")} />
              {generate.isPending ? "Generating…" : "Generate report"}
            </Button>
          </div>
        </Card>

        {selected && <ReportEditor key={selected.id} report={selected} onSelect={setSelectedId} />}

        <Card aria-labelledby={`${id}-past`}>
          <CardHeader id={`${id}-past`} title="Saved reports" sub="Newest first" />
          {reportsQ.isLoading ? (
            <Skeleton className="m-5 h-24" />
          ) : reportsQ.error ? (
            <ErrorState message={reportsQ.error.message} onRetry={() => void reportsQ.refetch()} />
          ) : reports.length === 0 ? (
            <EmptyState icon={<FileText />} title="No reports yet" body="Generate this week's report above." />
          ) : (
            <ul className="px-5 pb-3">
              {reports.map((r) => (
                <ReportRow key={r.id} report={r} selected={r.id === effectiveId} onOpen={() => setSelectedId(r.id)} />
              ))}
            </ul>
          )}
        </Card>
      </PageBody>
    </>
  );
}

function ReportRow({ report: r, selected, onOpen }: { report: Report; selected: boolean; onOpen: () => void }) {
  const exp = useExports(r);
  return (
    <li className={cn("flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0", selected && "font-semibold")}>
      <button type="button" onClick={onOpen} className="min-h-11 min-w-0 flex-1 text-left text-sm hover:underline">
        {fmt(r.period_start, "MMM d")} – {fmt(r.period_end, "MMM d, yyyy")}
      </button>
      <Pill className={r.status === "sent" ? "bg-green-soft text-green-text" : "bg-surface-2 text-muted border border-border"}>
        {r.status === "sent" ? `Sent ${r.sent_at ? fmt(r.sent_at.slice(0, 10), "MMM d") : ""}` : "Draft"}
      </Pill>
      <Button size="sm" onClick={exp.pdf} disabled={exp.busy} aria-label={`Export PDF for week of ${fmt(r.period_start, "MMM d")}`}>
        PDF
      </Button>
      <Button size="sm" onClick={exp.word} disabled={exp.busy} aria-label={`Export Word for week of ${fmt(r.period_start, "MMM d")}`}>
        Word
      </Button>
    </li>
  );
}

function useExports(report: Report) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const content = reportContent(report);
  const name = reportFileName(content.header.name, report.period_start, report.period_end);
  const wrap = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast({ tone: "error", message: `Export failed: ${errMessage(e)}` });
    } finally {
      setBusy(false);
    }
  };
  return {
    busy,
    pdf: wrap(async () => {
      const { renderReportPdf } = await import("./report-pdf");
      download(await renderReportPdf(content, report.summary), `${name}.pdf`);
    }),
    word: wrap(async () => {
      const { renderReportDocx } = await import("./report-docx");
      download(await renderReportDocx(content, report.summary), `${name}.docx`);
    }),
  };
}

function ReportEditor({ report, onSelect }: { report: Report; onSelect: (id: string | null) => void }) {
  const id = useId();
  const content = reportContent(report);
  const isSent = report.status === "sent";
  const [summary, setSummary] = useState(report.summary ?? "");
  const [support, setSupport] = useState(content.supportNeeded ?? "");
  const save = useSaveReportText();
  const markSent = useMarkSent();
  const duplicate = useDuplicateReport();
  const del = useDeleteReport();
  const generate = useGenerateReport();
  const exp = useExports(report);
  const dirty = summary !== (report.summary ?? "") || support !== (content.supportNeeded ?? "");

  const saveText = () => save.mutateAsync({ report, summary, supportNeeded: support });

  return (
    <Card aria-labelledby={`${id}-h`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 id={`${id}-h`} className="text-[15px] font-bold">
            Week of {fmt(report.period_start, "MMM d")} – {fmt(report.period_end, "MMM d, yyyy")}
          </h2>
          <p className="text-[13px] text-muted">
            {isSent ? "Sent. Read-only. Duplicate it to make changes." : "Draft. Content is a snapshot from when it was generated."}
          </p>
        </div>
        <Button size="sm" onClick={exp.pdf} disabled={exp.busy || dirty} title={dirty ? "Save your text first" : undefined}>
          <Download size={16} aria-hidden /> Export PDF
        </Button>
        <Button size="sm" onClick={exp.word} disabled={exp.busy || dirty} title={dirty ? "Save your text first" : undefined}>
          <Download size={16} aria-hidden /> Export Word
        </Button>
        {isSent ? (
          <Button size="sm" onClick={() => duplicate.mutate(report, { onSuccess: (r) => onSelect(r.id) })}>
            <Copy size={16} aria-hidden /> Duplicate to edit
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              onClick={() => generate.mutate({ periodStart: report.period_start, periodEnd: report.period_end })}
              disabled={generate.isPending}
            >
              <RefreshCw size={16} aria-hidden /> Refresh data
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                if (dirty) await saveText();
                markSent.mutate(report);
              }}
            >
              <Send size={16} aria-hidden /> Mark as sent
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Delete draft"
              onClick={() => {
                del.mutate(report.id);
                onSelect(null);
              }}
            >
              <Trash2 size={16} aria-hidden />
            </Button>
          </>
        )}
      </div>

      {!isSent && (
        <div className="grid gap-4 border-b border-line px-5 py-4 lg:grid-cols-2">
          <Field label="Summary (your opening paragraph)" htmlFor={`${id}-sum`}>
            <Textarea id={`${id}-sum`} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="The week in two or three sentences." />
          </Field>
          <Field label="Support needed" htmlFor={`${id}-sup`}>
            <Textarea id={`${id}-sup`} value={support} onChange={(e) => setSupport(e.target.value)} placeholder="Access, resources or decisions you need from the Coordinator." />
          </Field>
          <div className="flex justify-end lg:col-span-2">
            <Button variant="primary" onClick={() => void saveText()} disabled={!dirty || save.isPending}>
              {save.isPending ? "Saving…" : dirty ? "Save text" : "Saved"}
            </Button>
          </div>
        </div>
      )}

      <div className="px-5 py-5 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-5 md:p-8">
          <ReportPreview content={{ ...content, supportNeeded: support }} summary={summary} />
        </div>
      </div>
    </Card>
  );
}
