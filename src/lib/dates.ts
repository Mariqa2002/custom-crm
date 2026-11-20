import {
  addDays,
  differenceInCalendarDays,
  format,
  isWeekend,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import type { Phase, Task } from "./types";

/** All "today" logic uses St Kitts time (UTC−4, no daylight saving). */
export const TZ = "America/St_Kitts";

const isoFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Current date in St Kitts as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return isoFmt.format(now);
}

/** St Kitts calendar date of a timestamp (e.g. completed_at). */
export function dateOfTimestamp(ts: string | null | undefined): string | null {
  if (!ts) return null;
  return isoFmt.format(new Date(ts));
}

/** Hour of day (0–23) in St Kitts. */
export function hourInTZ(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(now),
  ) % 24;
}

export function greeting(now: Date = new Date()): string {
  const h = hourInTZ(now);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** Parse a YYYY-MM-DD string as a local calendar day (no timezone shift). */
export function day(iso: string): Date {
  return parseISO(iso);
}

export function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function addDaysISO(iso: string, n: number): string {
  return toISO(addDays(day(iso), n));
}

export function fmt(iso: string | null | undefined, pattern = "MMM d"): string {
  if (!iso) return "";
  return format(day(iso), pattern);
}

/** e.g. "Nov 16–20, 2026" or "Nov 30 – Dec 4, 2026". */
export function fmtRange(start: string, end: string): string {
  const s = day(start);
  const e = day(end);
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${format(s, "MMM d")}–${format(e, "d, yyyy")}`;
  }
  return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

/** ISO weekday, 1 = Monday … 7 = Sunday. */
export function isoWeekday(iso: string): number {
  const d = day(iso).getDay();
  return d === 0 ? 7 : d;
}

/** Monday of the week containing iso. */
export function weekMonday(iso: string): string {
  return toISO(startOfISOWeek(day(iso)));
}

/** Friday of the week containing iso. */
export function weekFriday(iso: string): string {
  return addDaysISO(weekMonday(iso), 4);
}

/** The five working days (Mon–Fri) of the week containing iso. */
export function workWeek(iso: string): string[] {
  const mon = weekMonday(iso);
  return [0, 1, 2, 3, 4].map((i) => addDaysISO(mon, i));
}

/** "Day X of 30": calendar days from transition start (start = day 1). */
export function dayOfTransition(today: string, start: string): number {
  return differenceInCalendarDays(day(today), day(start)) + 1;
}

export function transitionLength(start: string, end: string): number {
  return differenceInCalendarDays(day(end), day(start)) + 1;
}

export function isTransitionComplete(today: string, end: string): boolean {
  return today > end;
}

export function isTransitionStarted(today: string, start: string): boolean {
  return today >= start;
}

// ---------------------------------------------------------------------------
// Phase completion. A phase is complete once its deliverable is submitted.
// ---------------------------------------------------------------------------

type PhaseLike = Pick<Phase, "number" | "deliverable_submitted_at">;

export function isPhaseComplete(p: Pick<Phase, "deliverable_submitted_at">): boolean {
  return !!p.deliverable_submitted_at;
}

export function allPhasesComplete(phases: Pick<Phase, "deliverable_submitted_at">[]): boolean {
  return phases.length > 0 && phases.every(isPhaseComplete);
}

/**
 * A completed phase is archived, and its tasks go with it: they leave Today,
 * the Schedule/Calendar and the task counts (they stay on the Phases page
 * under "Show completed phases", and reopening the phase brings them back).
 */
export function withoutCompletedPhaseTasks<T extends Pick<Task, "phase_id">>(
  tasks: T[],
  phases: Pick<Phase, "id" | "deliverable_submitted_at">[],
): T[] {
  const closed = new Set(phases.filter(isPhaseComplete).map((p) => p.id));
  return closed.size ? tasks.filter((t) => !t.phase_id || !closed.has(t.phase_id)) : tasks;
}

/**
 * The phase she is working on: the first phase, in order, that isn't complete.
 * It moves on as soon as a phase is marked complete, whatever the date.
 * Null once every phase is complete.
 */
export function getCurrentPhase<P extends PhaseLike>(phases: P[]): P | null {
  return [...phases].sort((a, b) => a.number - b.number).find((p) => !isPhaseComplete(p)) ?? null;
}

/** The current phase as it stood at the end of `date` (for report snapshots). */
export function getCurrentPhaseAsOf<P extends PhaseLike>(phases: P[], date: string): P | null {
  return (
    [...phases]
      .sort((a, b) => a.number - b.number)
      .find((p) => {
        const submitted = dateOfTimestamp(p.deliverable_submitted_at);
        return !submitted || submitted > date;
      }) ?? null
  );
}

/** Working days (Mon–Fri) from today to end, both inclusive. */
export function workingDaysLeft(today: string, end: string): number {
  if (today > end) return 0;
  let count = 0;
  let d = day(today);
  const last = day(end);
  while (d <= last) {
    if (!isWeekend(d)) count++;
    d = addDays(d, 1);
  }
  return count;
}

// ---------------------------------------------------------------------------
// Today screen: only what belongs to that one day.
// ---------------------------------------------------------------------------

export type TodayReason = "planned" | "due";

/**
 * Why a task appears on day D, or null if it doesn't. A task belongs to D
 * when it is planned for D or due on D: nothing from other days (no overdue
 * carry-over, no rest-of-phase). Archived tasks never appear.
 */
export function todayReason(
  task: Pick<Task, "planned_for" | "due_date" | "archived_at">,
  D: string,
): TodayReason | null {
  if (task.archived_at) return null;
  if (task.planned_for === D) return "planned";
  if (task.due_date === D) return "due";
  return null;
}

export type PhaseGroup<P extends Phase = Phase> = {
  phase: P;
  tasks: Task[];
  /** The current (first incomplete) phase. */
  isActive: boolean;
  done: number;
  total: number;
};

export type TodayGroups = {
  phases: PhaseGroup[];
  project: Task[];
  other: Task[];
  /** Open (not done) tasks on this day's list. */
  openCount: number;
};

const bySort = (a: Task, b: Task) =>
  a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);

/**
 * Group day D's tasks. Phase groups only appear when they have tasks on D.
 * Once the phases are retired (`retired`), phase tasks are listed with the
 * project or other tasks instead.
 */
export function groupTodayTasks(
  tasks: Task[],
  phases: Phase[],
  D: string,
  { retired = false }: { retired?: boolean } = {},
): TodayGroups {
  const currentId = retired ? null : (getCurrentPhase(phases)?.id ?? null);
  const knownPhases = new Set(retired ? [] : phases.map((p) => p.id));
  const project: Task[] = [];
  const other: Task[] = [];
  const phaseTasks = new Map<string, Task[]>();
  let openCount = 0;

  for (const t of withoutCompletedPhaseTasks(tasks, phases)) {
    if (!todayReason(t, D)) continue;
    if (t.status !== "done") openCount++;
    if (t.phase_id && knownPhases.has(t.phase_id)) {
      phaseTasks.set(t.phase_id, [...(phaseTasks.get(t.phase_id) ?? []), t]);
    } else if (t.project_id) project.push(t);
    else other.push(t);
  }

  const groups: PhaseGroup[] = [];
  for (const p of [...phases].sort((a, b) => a.number - b.number)) {
    const list = phaseTasks.get(p.id);
    if (!list?.length) continue;
    const { done, total } = phaseProgress(tasks, p.id);
    groups.push({ phase: p, tasks: list.sort(bySort), isActive: p.id === currentId, done, total });
  }

  return { phases: groups, project: project.sort(bySort), other: other.sort(bySort), openCount };
}

/** Progress for one phase: done / total of non-archived tasks. */
export function phaseProgress(tasks: Task[], phaseId: string) {
  const all = tasks.filter((t) => t.phase_id === phaseId && !t.archived_at);
  const done = all.filter((t) => t.status === "done").length;
  return { done, total: all.length };
}
