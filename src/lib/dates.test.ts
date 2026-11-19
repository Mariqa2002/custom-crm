import { describe, expect, it } from "vitest";
import { PHASES, at, task } from "@/test/fixtures";
import {
  dateOfTimestamp,
  dayOfTransition,
  fmtRange,
  allPhasesComplete,
  getCurrentPhase,
  getCurrentPhaseAsOf,
  groupTodayTasks,
  isTransitionComplete,
  todayISO,
  todayReason,
  transitionLength,
  weekFriday,
  weekMonday,
  workingDaysLeft,
} from "./dates";

describe("todayISO (America/St_Kitts, UTC−4)", () => {
  it("uses St Kitts date, not UTC", () => {
    // 02:30 UTC on Nov 19 is still 22:30 on Nov 18 in St Kitts
    expect(todayISO(new Date("2026-11-19T02:30:00Z"))).toBe("2026-11-18");
    // 04:00 UTC = midnight in St Kitts
    expect(todayISO(new Date("2026-11-19T04:00:00Z"))).toBe("2026-11-19");
  });

  it("converts timestamps to St Kitts dates", () => {
    expect(dateOfTimestamp("2026-11-20T03:59:00Z")).toBe("2026-11-19");
    expect(dateOfTimestamp(null)).toBeNull();
  });
});

describe("day X of 30", () => {
  it("Nov 16 is day 1 and Dec 15 is day 30", () => {
    expect(dayOfTransition("2026-11-16", "2026-11-16")).toBe(1);
    expect(dayOfTransition("2026-11-18", "2026-11-16")).toBe(3);
    expect(dayOfTransition("2026-12-15", "2026-11-16")).toBe(30);
    expect(transitionLength("2026-11-16", "2026-12-15")).toBe(30);
  });

  it("is complete only after Dec 15", () => {
    expect(isTransitionComplete("2026-12-15", "2026-12-15")).toBe(false);
    expect(isTransitionComplete("2026-12-16", "2026-12-15")).toBe(true);
  });
});

describe("current phase", () => {
  const done = (n: number, on = "2026-11-19") => ({ ...PHASES[n - 1], deliverable_submitted_at: at(on) });

  it("is the first phase that isn't complete, whatever the date", () => {
    expect(getCurrentPhase(PHASES)?.number).toBe(1);
    expect(getCurrentPhase([done(1), PHASES[1], PHASES[2], PHASES[3]])?.number).toBe(2);
    expect(getCurrentPhase([done(1), done(2), PHASES[2], PHASES[3]])?.number).toBe(3);
    expect(getCurrentPhase([done(1), done(2), done(3), PHASES[3]])?.number).toBe(4);
  });

  it("is null once every phase is complete", () => {
    const all = [done(1), done(2), done(3), done(4)];
    expect(getCurrentPhase(all)).toBeNull();
    expect(allPhasesComplete(all)).toBe(true);
    expect(allPhasesComplete(PHASES)).toBe(false);
    expect(allPhasesComplete([])).toBe(false);
  });

  it("as of a date ignores phases completed later", () => {
    const phases = [done(1, "2026-11-20"), PHASES[1], PHASES[2], PHASES[3]];
    expect(getCurrentPhaseAsOf(phases, "2026-11-19")?.number).toBe(1);
    expect(getCurrentPhaseAsOf(phases, "2026-11-20")?.number).toBe(2);
  });
});

describe("working days left in phase", () => {
  it("counts Mon–Fri inclusive", () => {
    expect(workingDaysLeft("2026-11-18", "2026-11-20")).toBe(3); // Wed, Thu, Fri
    expect(workingDaysLeft("2026-11-20", "2026-11-20")).toBe(1);
    expect(workingDaysLeft("2026-11-21", "2026-11-27")).toBe(5); // from Saturday
    expect(workingDaysLeft("2026-12-07", "2026-12-15")).toBe(7); // Phase 4 spans a weekend
  });

  it("is 0 once the end date has passed", () => {
    expect(workingDaysLeft("2026-11-23", "2026-11-20")).toBe(0);
  });
});

describe("weeks and formatting", () => {
  it("finds Monday and Friday of the week", () => {
    expect(weekMonday("2026-11-18")).toBe("2026-11-16");
    expect(weekMonday("2026-11-22")).toBe("2026-11-16"); // Sunday belongs to the ISO week
    expect(weekFriday("2026-11-18")).toBe("2026-11-20");
  });

  it("formats phase ranges like the spec", () => {
    expect(fmtRange("2026-11-16", "2026-11-20")).toBe("Nov 16–20, 2026");
    expect(fmtRange("2026-11-30", "2026-12-04")).toBe("Nov 30 – Dec 4, 2026");
  });
});

describe("Today inclusion rules: only that day", () => {
  const D = "2026-11-18";

  it("includes tasks planned for D or due on D", () => {
    expect(todayReason(task({ planned_for: D }), D)).toBe("planned");
    expect(todayReason(task({ due_date: D }), D)).toBe("due");
  });

  it("excludes tasks from other days: overdue, later, rest of the phase", () => {
    expect(todayReason(task({ due_date: "2026-11-17" }), D)).toBeNull();
    expect(todayReason(task({ phase_id: "p1", due_date: "2026-11-20" }), D)).toBeNull();
    expect(todayReason(task({ planned_for: "2026-11-19" }), D)).toBeNull();
    expect(todayReason(task({}), D)).toBeNull();
  });

  it("keeps done tasks on their day (struck through)", () => {
    expect(todayReason(task({ planned_for: D, status: "done", completed_at: at(D) }), D)).toBe("planned");
  });

  it("excludes archived tasks", () => {
    expect(todayReason(task({ planned_for: D, archived_at: at(D) }), D)).toBeNull();
  });
});

describe("groupTodayTasks", () => {
  const D = "2026-11-18";
  const tasks = [
    task({ phase_id: "p1", planned_for: D, title: "phase today" }),
    task({ phase_id: "p1", due_date: "2026-11-20", title: "phase later" }),
    task({ phase_id: "p1", due_date: "2026-11-17", title: "late" }),
    task({ phase_id: "p2", due_date: "2026-11-27", title: "next phase" }),
    task({ project_id: "x", due_date: D, title: "proj due" }),
    task({ project_id: "x", due_date: "2026-11-25", title: "proj not today" }),
    task({ planned_for: D, title: "mine" }),
    task({ planned_for: D, status: "done", completed_at: at(D), title: "done today" }),
  ];

  it("lists only that day's tasks, grouped", () => {
    const g = groupTodayTasks(tasks, PHASES, D);
    expect(g.phases.map((p) => p.phase.id)).toEqual(["p1"]);
    expect(g.phases[0].isActive).toBe(true);
    expect(g.phases[0].tasks.map((t) => t.title)).toEqual(["phase today"]);
    expect(g.phases[0].total).toBe(3);
    expect(g.project.map((t) => t.title)).toEqual(["proj due"]);
    expect(g.other.map((t) => t.title)).toEqual(["mine", "done today"]);
    expect(g.openCount).toBe(3);
  });

  it("drops tasks of a completed phase: they're archived with it", () => {
    const phases = PHASES.map((p) => (p.id === "p1" ? { ...p, deliverable_submitted_at: at(D) } : p));
    const g = groupTodayTasks(tasks, phases, D);
    expect(g.phases).toEqual([]);
    expect(g.other.map((t) => t.title)).toEqual(["mine", "done today"]);
    expect(g.openCount).toBe(2);
  });

  it("files phase tasks with the rest once phases are retired", () => {
    const g = groupTodayTasks(tasks, PHASES, D, { retired: true });
    expect(g.phases).toEqual([]);
    expect(g.other.map((t) => t.title)).toEqual(["phase today", "mine", "done today"]);
  });
});
