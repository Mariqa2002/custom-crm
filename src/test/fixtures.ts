import type { Phase, Project, Task, Update } from "@/lib/types";

const T0 = "2026-11-01T12:00:00Z";

export function phase(n: number, start: string, end: string, extra: Partial<Phase> = {}): Phase {
  return {
    id: `p${n}`,
    user_id: "u",
    number: n,
    name: `Phase ${n} name`,
    start_date: start,
    end_date: end,
    deliverable: `Deliverable ${n}`,
    deliverable_submitted_at: null,
    color: ["accent", "green", "purple", "orange"][n - 1],
    created_at: T0,
    updated_at: T0,
    ...extra,
  };
}

export const PHASES: Phase[] = [
  phase(1, "2026-11-16", "2026-11-20"),
  phase(2, "2026-11-23", "2026-11-27"),
  phase(3, "2026-11-30", "2026-12-04"),
  phase(4, "2026-12-07", "2026-12-15"),
];

let n = 0;
export function task(extra: Partial<Task> = {}): Task {
  n++;
  return {
    id: `t${n}`,
    user_id: "u",
    phase_id: null,
    project_id: null,
    title: `Task ${n}`,
    details: null,
    collaborator: null,
    status: "todo",
    due_date: null,
    planned_for: null,
    sort_order: n,
    completed_at: null,
    created_at: T0,
    updated_at: T0,
    from_plan: false,
    archived_at: null,
    ...extra,
  };
}

export function project(extra: Partial<Project> = {}): Project {
  n++;
  return {
    id: `pr${n}`,
    user_id: "u",
    name: `Project ${n}`,
    client: null,
    status: "in_progress",
    outstanding_tasks: null,
    target_date: null,
    remarks: null,
    priority: null,
    color: "#0074F8",
    archived_at: null,
    status_changed_at: null,
    created_at: T0,
    updated_at: T0,
    ...extra,
  };
}

export function update(extra: Partial<Update> = {}): Update {
  n++;
  return {
    id: `up${n}`,
    user_id: "u",
    task_id: null,
    project_id: null,
    body: `Update ${n}`,
    include_in_report: true,
    is_risk: false,
    waiting_on_client: false,
    resolved_at: null,
    happened_on: "2026-11-18",
    created_at: T0,
    updated_at: T0,
    ...extra,
  };
}

/** A timestamp at noon St Kitts time on the given date. */
export function at(date: string, hourStKitts = 12) {
  const utcMidnight = new Date(`${date}T00:00:00Z`).getTime();
  return new Date(utcMidnight + (hourStKitts + 4) * 3_600_000).toISOString(); // UTC−4
}
