import { STATUS_LABEL } from "./constants";
import {
  addDaysISO,
  dateOfTimestamp,
  fmt,
  dayOfTransition,
  getCurrentPhaseAsOf,
  transitionLength,
} from "./dates";
import type { Phase, Profile, Project, Task, Update } from "./types";

export const REPORT_TITLE = "Weekly Progress Report — Web Developer";

export type ReportLine = { body: string; project: string | null; date: string };

export type ReportContent = {
  version: 1;
  header: {
    title: string;
    name: string;
    jobTitle: string;
    unit: string;
    to: string;
    periodStart: string;
    periodEnd: string;
    preparedOn: string;
  };
  /** Null once the transition phases are retired. */
  transition: {
    day: number | null;
    totalDays: number;
    complete: boolean;
    currentPhase: { number: number; name: string } | null;
    phases: {
      number: number;
      name: string;
      done: number;
      total: number;
      deliverable: string;
      endDate: string;
      dueThisWeek: boolean;
      submittedOn: string | null;
    }[];
  } | null;
  completed: { group: string; items: { title: string; completedOn: string }[] }[];
  upcoming: { title: string; dueDate: string | null; group: string; inProgress: boolean }[];
  register: {
    name: string;
    client: string | null;
    status: string;
    outstanding: string | null;
    targetDate: string | null;
    remarks: string | null;
    priority: number | null;
    changed: boolean;
  }[];
  showPriority: boolean;
  updates: { group: string; items: { date: string; body: string }[] }[];
  risks: ReportLine[];
  waiting: ReportLine[];
  supportNeeded: string;
};

export type ReportInput = {
  profile: Pick<Profile, "full_name" | "job_title" | "transition_start" | "transition_end"> | null;
  phases: Phase[];
  tasks: Task[];
  projects: Project[];
  updates: Update[];
  periodStart: string;
  periodEnd: string;
  preparedOn: string;
  supportNeeded?: string;
  /** Phases retired: leave the transition section out. */
  phasesRetired?: boolean;
};

const inRange = (d: string | null, start: string, end: string) => !!d && d >= start && d <= end;

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    m.set(k, [...(m.get(k) ?? []), it]);
  }
  return m;
}

/** Build the frozen snapshot saved in reports.content. Pure: easy to test. */
export function assembleReport(input: ReportInput): ReportContent {
  const { profile, phases, projects, updates, periodStart: start, periodEnd: end } = input;
  const tasks = input.tasks.filter((t) => !t.archived_at);
  const phaseById = new Map(phases.map((p) => [p.id, p]));
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const taskGroup = (t: Task) => {
    const ph = t.phase_id ? phaseById.get(t.phase_id) : undefined;
    if (ph) return `Phase ${ph.number}: ${ph.name}`;
    const pr = t.project_id ? projectById.get(t.project_id) : undefined;
    if (pr) return pr.name;
    return "Other tasks";
  };

  // Transition status
  const tStart = profile?.transition_start ?? "2026-11-16";
  const tEnd = profile?.transition_end ?? "2026-12-15";
  const totalDays = transitionLength(tStart, tEnd);
  // Status "as of" the earlier of the prepared date and the period end, so a
  // report prepared mid-week doesn't claim Friday's day count.
  const asOf = input.preparedOn >= start && input.preparedOn < end ? input.preparedOn : end;
  const rawDay = dayOfTransition(asOf, tStart);
  const active = getCurrentPhaseAsOf(phases, asOf);
  const phaseRows = [...phases]
    .sort((a, b) => a.number - b.number)
    .map((p) => {
      const pts = tasks.filter((t) => t.phase_id === p.id);
      return {
        number: p.number,
        name: p.name,
        done: pts.filter((t) => t.status === "done").length,
        total: pts.length,
        deliverable: p.deliverable,
        endDate: p.end_date,
        dueThisWeek: inRange(p.end_date, start, end),
        submittedOn: dateOfTimestamp(p.deliverable_submitted_at),
      };
    });

  // Completed this week
  const completed = tasks
    .filter((t) => t.status === "done" && inRange(dateOfTimestamp(t.completed_at), start, end))
    .sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""));
  const completedGroups = [...groupBy(completed, taskGroup)].map(([group, items]) => ({
    group,
    items: items.map((t) => ({ title: t.title, completedOn: dateOfTimestamp(t.completed_at)! })),
  }));

  // In progress and planned next week: open tasks due within 7 days of the period end
  const horizon = addDaysISO(end, 7);
  const upcoming = tasks
    .filter(
      (t) =>
        t.status !== "done" &&
        ((t.due_date !== null && t.due_date <= horizon) || t.status === "in_progress"),
    )
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .map((t) => ({
      title: t.title,
      dueDate: t.due_date,
      group: taskGroup(t),
      inProgress: t.status === "in_progress",
    }));

  // Register
  const live = projects.filter((p) => !p.archived_at);
  const register = live.map((p) => ({
    name: p.name,
    client: p.client,
    status: STATUS_LABEL[p.status],
    outstanding: p.outstanding_tasks,
    targetDate: p.target_date,
    remarks: p.remarks,
    priority: p.priority,
    changed: inRange(dateOfTimestamp(p.status_changed_at), start, end),
  }));

  const projectName = (id: string | null) => (id ? (projectById.get(id)?.name ?? null) : null);

  // Updates in the period marked for the report
  const periodUpdates = updates
    .filter((u) => u.include_in_report && inRange(u.happened_on, start, end))
    .sort((a, b) => a.happened_on.localeCompare(b.happened_on) || a.created_at.localeCompare(b.created_at));
  const updateGroups = [...groupBy(periodUpdates, (u) => projectName(u.project_id) ?? "General")].map(
    ([group, items]) => ({ group, items: items.map((u) => ({ date: u.happened_on, body: u.body })) }),
  );

  const line = (u: Update): ReportLine => ({ body: u.body, project: projectName(u.project_id), date: u.happened_on });

  const risks = updates
    .filter((u) => u.is_risk && !u.resolved_at && u.happened_on <= end)
    .sort((a, b) => a.happened_on.localeCompare(b.happened_on))
    .map(line);

  const waiting = updates
    .filter((u) => u.waiting_on_client && inRange(u.happened_on, start, end))
    .sort((a, b) => a.happened_on.localeCompare(b.happened_on))
    .map(line);

  return {
    version: 1,
    header: {
      title: REPORT_TITLE,
      name: profile?.full_name || "Web Developer",
      jobTitle: profile?.job_title ?? "Web Developer",
      unit: "e-Government Unit",
      to: "e-Government Coordinator",
      periodStart: start,
      periodEnd: end,
      preparedOn: input.preparedOn,
    },
    transition: input.phasesRetired
      ? null
      : {
          day: rawDay >= 1 ? Math.min(rawDay, totalDays) : null,
          totalDays,
          complete: end > tEnd,
          currentPhase: active ? { number: active.number, name: active.name } : null,
          phases: phaseRows,
        },
    completed: completedGroups,
    upcoming,
    register,
    showPriority: register.some((r) => r.priority !== null),
    updates: updateGroups,
    risks,
    waiting,
    supportNeeded: input.supportNeeded ?? "",
  };
}

/** Transition status as plain lines, shared by the preview, PDF and Word export. */
export function transitionLines(c: ReportContent): { status: string; phases: string[] } | null {
  const t = c.transition;
  if (!t) return null;
  const status =
    (t.complete ? "Transition complete." : t.day ? `Day ${t.day} of ${t.totalDays}.` : "Transition not started.") +
    (t.currentPhase && !t.complete ? ` Current phase: Phase ${t.currentPhase.number}, ${t.currentPhase.name}.` : "");
  const phases = t.phases.map(
    (p) =>
      `Phase ${p.number}, ${p.name}: ${p.done} / ${p.total} tasks done` +
      (p.submittedOn
        ? `; deliverable submitted ${fmt(p.submittedOn, "MMM d")}`
        : p.dueThisWeek
          ? `; deliverable due ${fmt(p.endDate, "MMM d")}: ${p.deliverable}`
          : ""),
  );
  return { status, phases };
}

/** e.g. Weekly-Report_Cumberbatch_2026-11-16_to_2026-11-20 */
export function reportFileName(name: string, start: string, end: string) {
  const last = name.trim().split(/\s+/).at(-1)?.replace(/[^A-Za-z0-9-]/g, "") || "Report";
  return `Weekly-Report_${last}_${start}_to_${end}`;
}

export function reportTitle(start: string, end: string) {
  return `${REPORT_TITLE} (${start} to ${end})`;
}

/** Empty-section lines shown in preview and exports. */
export const EMPTY = {
  completed: "No tasks completed this week.",
  upcoming: "No open tasks due in the next 7 days.",
  register: "No projects in the register.",
  updates: "No updates logged this week.",
  risks: "No risks raised this week.",
  waiting: "Nothing waiting on clients this week.",
  support: "No support needed this week.",
  summary: "No summary written.",
};
