"use client";

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  FolderKanban,
  NotebookPen,
  PartyPopper,
  Table2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { RetirePhasesModal } from "@/components/phases/retire-phases-modal";
import { RegisterTable, StatusPill } from "@/components/projects/register-table";
import { SchedulePanel } from "@/components/schedule/schedule-panel";
import { PageHeader } from "@/components/shell/page-header";
import { PageWithAside } from "@/components/shell/page-layout";
import { useShell } from "@/components/shell/shell-context";
import { OpenTaskProvider, TaskList } from "@/components/tasks/task-list";
import { UpdateItem } from "@/components/updates/update-item";
import { Button, Card, CardHeader, EmptyState, ProgressBar, cn } from "@/components/ui/primitives";
import { WEEKDAYS, phaseColor } from "@/lib/constants";
import {
  addDaysISO,
  allPhasesComplete,
  dayOfTransition,
  fmt,
  fmtRange,
  getCurrentPhase,
  greeting,
  isPhaseComplete,
  isTransitionComplete,
  isoWeekday,
  phaseProgress,
  todayISO,
  transitionLength,
  weekMonday,
  withoutCompletedPhaseTasks,
  workingDaysLeft,
} from "@/lib/dates";
import { usePhases, usePhasesRetired, useProfile, useResponsibilities } from "@/lib/queries/misc";
import { useActiveProjects } from "@/lib/queries/projects";
import { useReports } from "@/lib/queries/reports";
import { useTasks, useToday } from "@/lib/queries/tasks";
import { useUpdates } from "@/lib/queries/updates";
import type { Phase, Project, Task } from "@/lib/types";

const linkBtn =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap";

export function DashboardView() {
  const today = todayISO();
  const profile = useProfile().data;
  const phases = usePhases().data ?? [];
  const tasks = (useTasks().data ?? []).filter((t) => !t.archived_at);
  const projects = useActiveProjects().data ?? [];
  const updates = useUpdates().data ?? [];
  const responsibilities = useResponsibilities().data ?? [];
  const retired = usePhasesRetired();
  const { openLogUpdate } = useShell();

  const start = profile?.transition_start ?? "2026-11-16";
  const end = profile?.transition_end ?? "2026-12-15";
  const total = transitionLength(start, end);
  const dayX = dayOfTransition(today, start);
  const periodOver = isTransitionComplete(today, end);
  // The first phase that isn't complete. Moves on as soon as a phase is marked complete.
  const active = retired ? null : getCurrentPhase(phases);
  const firstName = profile?.full_name?.trim().split(/\s+/)[0];
  const openRisks = updates.filter((u) => u.is_risk && !u.resolved_at);

  const phaseTasks = tasks.filter((t) => t.phase_id);
  const overallDone = phaseTasks.filter((t) => t.status === "done").length;

  const dayLabel = periodOver
    ? "Transition period over"
    : dayX < 1
      ? `Transition starts ${fmt(start, "MMM d")}`
      : `Day ${dayX} of ${total}`;

  const register = (
    <Card aria-labelledby="reg-h">
      <CardHeader
        id="reg-h"
        icon={<Table2 size={18} />}
        title="Assignment Register"
        sub={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
        action={
          <Link href="/register" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-text hover:underline">
            Open <ArrowRight size={14} aria-hidden />
          </Link>
        }
      />
      {projects.length ? (
        <RegisterTable projects={projects} />
      ) : (
        <EmptyState title="No projects yet" body="Add projects from the sidebar or the register." />
      )}
    </Card>
  );

  return (
    <OpenTaskProvider>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        sub={
          <>
            {fmt(today, "EEEE, MMMM d, yyyy")}
            {!retired && <> · {dayLabel}</>}
          </>
        }
        actions={
          <Link href="/reports?generate=1" className={cn(linkBtn, "bg-accent text-on-accent hover:brightness-110")}>
            <FileText size={16} aria-hidden /> Generate report
          </Link>
        }
      />
      <PageWithAside aside={<SchedulePanel />}>
        <ReportReminder today={today} weeklyDay={profile?.weekly_report_day ?? 5} />

        {periodOver && !retired && (
          <Card className="flex items-center gap-4 p-5">
            <PartyPopper className="shrink-0 text-green-text" aria-hidden />
            <div>
              <p className="font-bold">Transition period over</p>
              <p className="text-sm text-muted">
                The 30-day transition ended on {fmt(end, "MMMM d")}. Keep the register and updates current.
              </p>
            </div>
          </Card>
        )}

        {retired ? (
          <ProjectProgressCard projects={projects} tasks={tasks} />
        ) : (
          <TransitionProgressCard
            phases={phases}
            tasks={tasks}
            activeId={active?.id ?? null}
            summary={`${overallDone} of ${phaseTasks.length} plan tasks done · ${fmtRange(start, end)}`}
          />
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {active ? <ActivePhaseCard phase={active} /> : <TodayPlanCard today={today} />}
          <div className="grid grid-cols-2 content-start gap-4 lg:grid-cols-1">
            {active ? (
              <DaysLeftCard phase={active} today={today} />
            ) : (
              <DueThisWeekCard tasks={withoutCompletedPhaseTasks(tasks, phases)} today={today} />
            )}
            <StatCard
              icon={<FolderKanban size={18} />}
              label="Projects in register"
              value={projects.length}
              sub={`${projects.filter((p) => p.status === "completed").length} completed`}
              href="/register"
            />
            <StatCard
              icon={<AlertTriangle size={18} />}
              label="Open risks"
              value={openRisks.length}
              sub={openRisks.length ? "Resolve from Updates & Notes" : "None flagged"}
              href="/notes"
              warn={openRisks.length > 0}
            />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card aria-labelledby="resp-h">
            <CardHeader id="resp-h" icon={<ClipboardList size={18} />} title="Ongoing responsibilities" />
            <ul className="px-5 pb-4">
              {responsibilities.map((r) => (
                <li key={r.id} className="flex gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  {r.body}
                </li>
              ))}
            </ul>
          </Card>

          <Card aria-labelledby="recent-h">
            <CardHeader
              id="recent-h"
              icon={<NotebookPen size={18} />}
              title="Recent updates"
              action={
                <Link href="/notes" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent-text hover:underline">
                  All <ArrowRight size={14} aria-hidden />
                </Link>
              }
            />
            {updates.length === 0 ? (
              <EmptyState
                title="No updates yet"
                body="Log progress as you go. It feeds your weekly report."
                action={
                  <button type="button" onClick={() => openLogUpdate()} className={cn(linkBtn, "bg-accent text-on-accent")}>
                    Log update
                  </button>
                }
              />
            ) : (
              <ul className="px-5 pb-2">
                {/* Open risks stay at the top until resolved */}
                {[...openRisks, ...updates.filter((u) => !(u.is_risk && !u.resolved_at))].slice(0, 5).map((u) => (
                  <UpdateItem key={u.id} update={u} compact />
                ))}
              </ul>
            )}
          </Card>
        </div>

        {register}
      </PageWithAside>
    </OpenTaskProvider>
  );
}

/** The four phases. Complete ones show a tick; the first incomplete one is active. */
function TransitionProgressCard({
  phases,
  tasks,
  activeId,
  summary,
}: {
  phases: Phase[];
  tasks: Task[];
  activeId: string | null;
  summary: string;
}) {
  const [retireOpen, setRetireOpen] = useState(false);
  const sorted = [...phases].sort((a, b) => a.number - b.number);
  return (
    <Card aria-labelledby="prog-h" className="p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="prog-h" className="text-[15px] font-bold">
          Transition progress
        </h2>
        <p className="text-sm text-muted">{summary}</p>
      </div>
      <ol className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {sorted.map((p) => {
          const { done, total } = phaseProgress(tasks, p.id);
          const c = phaseColor(p.color);
          const isActive = activeId === p.id;
          const isDone = isPhaseComplete(p);
          return (
            <li
              key={p.id}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "rounded-2xl border p-3 transition-colors duration-300",
                isActive ? cn(c.border, c.soft) : "border-border bg-surface-2",
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-1 text-xs font-bold uppercase",
                  isActive || isDone ? c.text : "text-muted",
                )}
              >
                {isDone && <Check size={14} strokeWidth={3} aria-hidden />}
                Phase {p.number}
                {isActive && " · Active"}
                {isDone && " · Complete"}
              </p>
              <p className="mt-0.5 line-clamp-2 min-h-10 text-sm font-semibold">{p.name}</p>
              <ProgressBar
                value={done}
                max={total}
                label={`Phase ${p.number} progress`}
                fillClass={c.fill}
                className="mt-2 bg-surface"
              />
              <p className="mt-1.5 text-xs text-muted">
                {done} / {total} · {fmtRange(p.start_date, p.end_date)}
              </p>
            </li>
          );
        })}
      </ol>
      {allPhasesComplete(phases) && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-green-soft p-3">
          <PartyPopper size={18} className="shrink-0 text-green-text" aria-hidden />
          <p className="min-w-0 flex-1 text-sm font-semibold text-green-text">
            Every phase is complete. Retire them to switch this card to project progress.
          </p>
          <Button size="sm" onClick={() => setRetireOpen(true)}>
            Review and retire
          </Button>
          <RetirePhasesModal open={retireOpen} onClose={() => setRetireOpen(false)} />
        </div>
      )}
    </Card>
  );
}

/** Replaces Transition progress once the phases are retired. */
function ProjectProgressCard({ projects, tasks }: { projects: Project[]; tasks: Task[] }) {
  return (
    <Card aria-labelledby="pp-h" className="p-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="pp-h" className="text-[15px] font-bold">
          Project progress
        </h2>
        <p className="text-sm text-muted">
          {projects.length} active {projects.length === 1 ? "project" : "projects"}
        </p>
      </div>
      {projects.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No active projects. Add one from the sidebar or the register.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const pt = tasks.filter((t) => t.project_id === p.id);
            const done = pt.filter((t) => t.status === "done").length;
            return (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block rounded-2xl border border-border bg-surface-2 p-3 transition-colors hover:border-accent"
                >
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-3 shrink-0 rounded" style={{ background: p.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                  </span>
                  <span className="mt-2 block">
                    <StatusPill status={p.status} />
                  </span>
                  <ProgressBar
                    value={done}
                    max={pt.length}
                    label={`${p.name} progress`}
                    fillColor={p.color}
                    className="mt-3 bg-surface"
                  />
                  <span className="mt-1.5 block text-xs text-muted">
                    {pt.length ? `${done} / ${pt.length} tasks done` : "No tasks yet"}
                    {p.target_date && ` · Target ${fmt(p.target_date, "MMM d")}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Shown in place of the active phase card once phases are retired or all complete. */
function TodayPlanCard({ today }: { today: string }) {
  const { groups } = useToday(today);
  const list = [...groups.phases.flatMap((g) => g.tasks), ...groups.project, ...groups.other];
  const done = list.filter((t) => t.status === "done").length;
  return (
    <section aria-labelledby="plan-h" className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-start gap-3 p-5 pb-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-accent-text uppercase">{fmt(today, "EEEE, MMM d")}</p>
          <h2 id="plan-h" className="mt-0.5 text-lg font-extrabold">
            Today&apos;s plan
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            {list.length ? `${done} of ${list.length} done` : "Tasks planned or due today"}
          </p>
        </div>
        <Link href="/today" className={cn(linkBtn, "bg-accent text-on-accent hover:brightness-110")}>
          <CalendarCheck size={16} aria-hidden /> Plan my day
        </Link>
      </div>
      <div className="px-3 pt-1 pb-3 md:px-4">
        {list.length ? (
          <TaskList tasks={list.slice(0, 6)} reorderable={false} label="Today's tasks" />
        ) : (
          <p className="px-2 py-3 text-sm text-muted">Nothing planned for today yet.</p>
        )}
        {list.length > 6 && (
          <Link href="/today" className="block px-2 py-2 text-sm font-semibold text-accent-text hover:underline">
            {list.length - 6} more on Today
          </Link>
        )}
      </div>
    </section>
  );
}

/** Working days (Mon–Fri) from today to the current phase's end date, both inclusive. */
function DaysLeftCard({ phase, today }: { phase: Phase; today: string }) {
  const overdue = today > phase.end_date;
  return (
    <StatCard
      icon={<CalendarDays size={18} />}
      label={`Days left in Phase ${phase.number}`}
      value={workingDaysLeft(today, phase.end_date)}
      sub={
        overdue
          ? `Deliverable was due ${fmt(phase.end_date, "MMM d")}`
          : `Working days to ${fmt(phase.end_date, "EEE, MMM d")}`
      }
      href="/phases"
      warn={overdue}
    />
  );
}

/** Open tasks due from today through Sunday. */
function DueThisWeekCard({ tasks, today }: { tasks: Task[]; today: string }) {
  const sunday = addDaysISO(weekMonday(today), 6);
  const due = tasks.filter((t) => t.status !== "done" && !!t.due_date && t.due_date >= today && t.due_date <= sunday);
  return (
    <StatCard
      icon={<CalendarClock size={18} />}
      label="Due this week"
      value={due.length}
      sub={`Open tasks due by ${fmt(sunday, "EEE, MMM d")}`}
      href="/today"
    />
  );
}

function ActivePhaseCard({ phase }: { phase: Phase }) {
  const tasks = (useTasks().data ?? []).filter((t) => t.phase_id === phase.id && !t.archived_at);
  const c = phaseColor(phase.color);
  const open = tasks.filter((t) => t.status !== "done").sort((a, b) => a.sort_order - b.sort_order);
  const done = tasks.length - open.length;

  return (
    <section
      aria-labelledby="active-h"
      className="rounded-[var(--radius-card)] border border-border bg-surface shadow-card"
    >
      <div className="flex flex-wrap items-start gap-3 p-5 pb-3">
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-bold uppercase", c.text)}>
            Phase {phase.number} · {fmtRange(phase.start_date, phase.end_date)}
          </p>
          <h2 id="active-h" className="mt-0.5 text-lg font-extrabold">
            {phase.name}
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-orange-text">
            Deliverable due {fmt(phase.end_date, "EEE, MMM d")}: {phase.deliverable}
          </p>
        </div>
        <Link href="/today" className={cn(linkBtn, "bg-accent text-on-accent hover:brightness-110")}>
          <CalendarCheck size={16} aria-hidden /> Plan my day
        </Link>
      </div>
      <div className="px-5">
        <ProgressBar value={done} max={tasks.length} label="Active phase progress" fillClass={c.fill} />
        <p className="mt-1.5 text-xs text-muted">
          {done} of {tasks.length} done
        </p>
      </div>
      <div className="px-3 pt-2 pb-3 md:px-4">
        {open.length ? (
          <TaskList tasks={open.slice(0, 6)} reorderable={false} label="Open tasks in the active phase" />
        ) : (
          <p className="px-2 py-3 text-sm text-muted">
            Every task in this phase is done. Mark the phase complete on the Phases page.
          </p>
        )}
        {open.length > 6 && (
          <Link href="/phases" className="block px-2 py-2 text-sm font-semibold text-accent-text hover:underline">
            {open.length - 6} more on Phases
          </Link>
        )}
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  href,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  href?: string;
  warn?: boolean;
}) {
  const body = (
    <>
      <span className={cn("grid size-9 place-items-center rounded-xl", warn ? "bg-orange-soft text-orange-text" : "bg-accent-soft text-accent-text")}>
        {icon}
      </span>
      <p className="mt-3 text-[28px] leading-none font-extrabold">{value}</p>
      <p className="mt-1 text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted">{sub}</p>
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-[var(--radius-card)] border border-border bg-surface p-4 hover:bg-surface-2">
      {body}
    </Link>
  ) : (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">{body}</div>
  );
}

/** On her weekly report day (and after, that week) until the report is marked sent. */
function ReportReminder({ today, weeklyDay }: { today: string; weeklyDay: number }) {
  const reports = useReports();
  const monday = weekMonday(today);
  const weekday = isoWeekday(today);
  const sent = reports.data?.some((r) => r.period_start === monday && r.status === "sent");
  if (weekday < weeklyDay || reports.isLoading || sent) return null;
  const dayName = WEEKDAYS.find((d) => d.value === weeklyDay)?.label ?? "Friday";
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] bg-green-soft p-4 text-green-text">
      <BellRing className="shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-sm font-semibold">
        {weekday === weeklyDay ? `It's ${dayName}: ` : ""}this week&apos;s report for the e-Government Coordinator
        hasn&apos;t been marked sent yet.
      </p>
      <Link href="/reports?generate=1" className={cn(linkBtn, "bg-surface text-text")}>
        Open reports
      </Link>
    </div>
  );
}
