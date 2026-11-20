import { phaseColor } from "./constants";
import { addDaysISO, weekMonday } from "./dates";
import type { Event, Phase, Project, Task } from "./types";

export type ScheduleItem = {
  id: string;
  date: string;
  title: string;
  kind: "phase_start" | "deliverable" | "meeting" | "deadline" | "report" | "other" | "task";
  color: string; // CSS colour (var or hex)
  done?: boolean;
  time?: string | null;
  eventId?: string;
  taskId?: string;
  sub?: string;
};

const KIND_COLOR: Record<string, string> = {
  meeting: "var(--accent)",
  deadline: "var(--orange-text)",
  report: "var(--green)",
  other: "var(--muted)",
};

/** Phase starts and deliverable due dates come from phases; extras from events. */
export function buildScheduleItems(
  phases: Phase[],
  events: Event[],
  projects: Project[],
  { includePhases = true }: { includePhases?: boolean } = {},
): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const p of includePhases ? phases : []) {
    const color = phaseColor(p.color).dot;
    items.push({
      id: `start-${p.id}`,
      date: p.start_date,
      title: `Phase ${p.number} starts`,
      sub: p.name,
      kind: "phase_start",
      color,
    });
    items.push({
      id: `due-${p.id}`,
      date: p.end_date,
      title: `Deliverable due`,
      sub: p.deliverable,
      kind: "deliverable",
      color: "var(--orange-text)",
      done: !!p.deliverable_submitted_at,
    });
  }
  for (const e of events) {
    const project = projects.find((p) => p.id === e.project_id);
    items.push({
      id: `event-${e.id}`,
      eventId: e.id,
      date: e.on_date,
      title: e.title,
      sub: project?.name,
      kind: (e.kind as ScheduleItem["kind"]) ?? "other",
      color: project?.color ?? KIND_COLOR[e.kind] ?? "var(--muted)",
      time: e.starts_at ? e.starts_at.slice(0, 5) + (e.ends_at ? `–${e.ends_at.slice(0, 5)}` : "") : null,
    });
  }
  return items.sort(
    (a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""),
  );
}

/** Tasks on the day they're planned for, and again on their due date if that's a different day. */
export function taskScheduleItems(tasks: Task[], projects: Project[]): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const t of tasks) {
    if (t.archived_at) continue;
    const project = projects.find((p) => p.id === t.project_id);
    const base = {
      taskId: t.id,
      title: t.title,
      kind: "task" as const,
      color: project?.color ?? "var(--accent)",
      done: t.status === "done",
    };
    if (t.planned_for) items.push({ ...base, id: `task-${t.id}`, date: t.planned_for, sub: project?.name });
    if (t.due_date && t.due_date !== t.planned_for) {
      items.push({
        ...base,
        id: `due-task-${t.id}`,
        date: t.due_date,
        sub: project ? `Due · ${project.name}` : "Due",
        color: t.status === "done" ? base.color : "var(--orange)",
      });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/** Everything on one day: events (by time), then tasks and phase dates. */
export function itemsOnDay(items: ScheduleItem[], D: string): ScheduleItem[] {
  return items
    .filter((i) => i.date === D)
    .sort((a, b) => {
      if (!!a.time !== !!b.time) return a.time ? -1 : 1;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });
}

/** Group upcoming items: This week / Next week / Later (from Monday of this week). */
export function groupTimeline(items: ScheduleItem[], today: string) {
  const mon = weekMonday(today);
  const nextMon = addDaysISO(mon, 7);
  const afterNext = addDaysISO(mon, 14);
  return {
    thisWeek: items.filter((i) => i.date >= mon && i.date < nextMon),
    nextWeek: items.filter((i) => i.date >= nextMon && i.date < afterNext),
    later: items.filter((i) => i.date >= afterNext),
  };
}
