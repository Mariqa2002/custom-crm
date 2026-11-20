import { describe, expect, it } from "vitest";
import { PHASES, task } from "@/test/fixtures";
import { buildScheduleItems, groupTimeline, itemsOnDay, taskScheduleItems } from "./schedule";

describe("schedule", () => {
  it("derives phase starts and deliverables from phases", () => {
    const items = buildScheduleItems(PHASES, [], []);
    expect(items.filter((i) => i.kind === "phase_start").map((i) => i.date)).toEqual([
      "2026-11-16",
      "2026-11-23",
      "2026-11-30",
      "2026-12-07",
    ]);
    expect(items.filter((i) => i.kind === "deliverable").map((i) => i.date)).toEqual([
      "2026-11-20",
      "2026-11-27",
      "2026-12-04",
      "2026-12-15",
    ]);
  });

  it("groups into this week, next week and later", () => {
    const g = groupTimeline(buildScheduleItems(PHASES, [], []), "2026-11-18");
    expect(g.thisWeek.map((i) => i.date)).toEqual(["2026-11-16", "2026-11-20"]);
    expect(g.nextWeek.map((i) => i.date)).toEqual(["2026-11-23", "2026-11-27"]);
    expect(g.later).toHaveLength(4);
  });

  it("leaves phase dates out once phases are retired", () => {
    expect(buildScheduleItems(PHASES, [], [], { includePhases: false })).toEqual([]);
  });

  it("puts tasks on their planned day and their due day", () => {
    const items = taskScheduleItems(
      [
        task({ title: "both", planned_for: "2026-11-18", due_date: "2026-11-20" }),
        task({ title: "same day", planned_for: "2026-11-18", due_date: "2026-11-18" }),
      ],
      [],
    );
    expect(itemsOnDay(items, "2026-11-18").map((i) => i.title)).toEqual(["both", "same day"]);
    expect(itemsOnDay(items, "2026-11-20").map((i) => [i.title, i.sub])).toEqual([["both", "Due"]]);
  });
});
