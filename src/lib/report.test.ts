import { describe, expect, it } from "vitest";
import { PHASES, at, project, task, update } from "@/test/fixtures";
import { assembleReport, reportFileName } from "./report";

const profile = {
  full_name: "Mariqa J. Cumberbatch",
  job_title: "Web Developer",
  transition_start: "2026-11-16",
  transition_end: "2026-12-15",
};

function build(overrides: Partial<Parameters<typeof assembleReport>[0]> = {}) {
  return assembleReport({
    profile,
    phases: PHASES,
    tasks: [],
    projects: [],
    updates: [],
    periodStart: "2026-11-16",
    periodEnd: "2026-11-20",
    preparedOn: "2026-11-20",
    ...overrides,
  });
}

describe("assembleReport", () => {
  it("fills the header", () => {
    const r = build();
    expect(r.header.title).toBe("Weekly Progress Report — Web Developer");
    expect(r.header.name).toBe("Mariqa J. Cumberbatch");
    expect(r.header.unit).toBe("e-Government Unit");
    expect(r.header.to).toBe("e-Government Coordinator");
    expect(r.header.periodStart).toBe("2026-11-16");
  });

  it("reports transition status as of the period end", () => {
    const r = build({
      tasks: [task({ phase_id: "p1", status: "done", completed_at: at("2026-11-17") }), task({ phase_id: "p1" })],
    });
    expect(r.transition?.day).toBe(5);
    expect(build({ preparedOn: "2026-11-18" }).transition?.day).toBe(3); // prepared mid-week
    expect(r.transition?.currentPhase?.number).toBe(1);
    expect(r.transition?.phases[0]).toMatchObject({ done: 1, total: 2, dueThisWeek: true });
    expect(r.transition?.phases[1].dueThisWeek).toBe(false);
  });

  it("names the first phase not yet complete as current", () => {
    const phases = PHASES.map((p) => (p.number === 1 ? { ...p, deliverable_submitted_at: at("2026-11-19") } : p));
    expect(build({ phases }).transition?.currentPhase?.number).toBe(2);
  });

  it("leaves the transition section out once phases are retired", () => {
    expect(build({ phasesRetired: true }).transition).toBeNull();
  });

  it("lists tasks completed in the period, grouped", () => {
    const pr = project({ name: "Solarise Project" });
    const r = build({
      projects: [pr],
      tasks: [
        task({ phase_id: "p1", title: "In week", status: "done", completed_at: at("2026-11-18") }),
        task({ project_id: pr.id, title: "Project done", status: "done", completed_at: at("2026-11-20", 23) }),
        task({ phase_id: "p1", title: "Last week", status: "done", completed_at: at("2026-11-13") }),
        task({ phase_id: "p1", title: "Archived", status: "done", completed_at: at("2026-11-18"), archived_at: at("2026-11-19") }),
      ],
    });
    expect(r.completed.map((g) => g.group)).toEqual(["Phase 1: Phase 1 name", "Solarise Project"]);
    expect(r.completed.flatMap((g) => g.items.map((i) => i.title))).toEqual(["In week", "Project done"]);
  });

  it("lists open tasks due in the next 7 days as upcoming", () => {
    const r = build({
      tasks: [
        task({ title: "Due next Tue", due_date: "2026-11-24" }),
        task({ title: "Due in 3 weeks", due_date: "2026-12-11" }),
        task({ title: "Done", due_date: "2026-11-24", status: "done", completed_at: at("2026-11-19") }),
        task({ title: "Overdue still open", due_date: "2026-11-19" }),
      ],
    });
    expect(r.upcoming.map((t) => t.title)).toEqual(["Overdue still open", "Due next Tue"]);
  });

  it("marks register rows whose status changed this week", () => {
    const r = build({
      projects: [
        project({ name: "Changed", status: "under_review", status_changed_at: at("2026-11-19") }),
        project({ name: "Old change", status_changed_at: at("2026-11-10") }),
        project({ name: "Archived", archived_at: at("2026-11-18") }),
      ],
    });
    expect(r.register.map((x) => [x.name, x.status, x.changed])).toEqual([
      ["Changed", "Under Review", true],
      ["Old change", "In Progress", false],
    ]);
    expect(r.showPriority).toBe(false);
  });

  it("includes only in-period updates flagged for the report", () => {
    const pr = project({ name: "gov.kn Homepage Redesign" });
    const r = build({
      projects: [pr],
      updates: [
        update({ body: "Included", project_id: pr.id, happened_on: "2026-11-17" }),
        update({ body: "Excluded flag", include_in_report: false }),
        update({ body: "Previous week", happened_on: "2026-11-12" }),
        update({ body: "General note", happened_on: "2026-11-19" }),
      ],
    });
    expect(r.updates).toEqual([
      { group: "gov.kn Homepage Redesign", items: [{ date: "2026-11-17", body: "Included" }] },
      { group: "General", items: [{ date: "2026-11-19", body: "General note" }] },
    ]);
  });

  it("lists unresolved risks and waiting-on-client updates", () => {
    const r = build({
      updates: [
        update({ body: "Open risk from last week", is_risk: true, happened_on: "2026-11-12" }),
        update({ body: "Resolved risk", is_risk: true, resolved_at: at("2026-11-18") }),
        update({ body: "Future risk", is_risk: true, happened_on: "2026-11-25" }),
        update({ body: "Waiting", waiting_on_client: true, include_in_report: false }),
      ],
    });
    expect(r.risks.map((x) => x.body)).toEqual(["Open risk from last week"]);
    expect(r.waiting.map((x) => x.body)).toEqual(["Waiting"]);
  });

  it("is a frozen snapshot: later changes to inputs do not alter it", () => {
    const t = task({ phase_id: "p1", title: "Original", status: "done", completed_at: at("2026-11-18") });
    const r = build({ tasks: [t] });
    const snapshot = JSON.parse(JSON.stringify(r));
    t.title = "Renamed later";
    expect(snapshot.completed[0].items[0].title).toBe("Original");
  });
});

describe("reportFileName", () => {
  it("matches the spec format", () => {
    expect(reportFileName("Mariqa J. Cumberbatch", "2026-11-16", "2026-11-20")).toBe(
      "Weekly-Report_Cumberbatch_2026-11-16_to_2026-11-20",
    );
  });
});
