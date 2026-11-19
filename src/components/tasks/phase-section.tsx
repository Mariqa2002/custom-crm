"use client";

import { ChevronDown, FileCheck2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { phaseColor } from "@/lib/constants";
import { fmt, fmtRange } from "@/lib/dates";
import type { Phase, Task } from "@/lib/types";
import { Pill, ProgressBar, cn } from "../ui/primitives";
import { TaskList } from "./task-list";

export function PhaseSection({
  phase,
  tasks,
  done,
  total,
  defaultOpen,
  isActive,
  footer,
  headerExtra,
  emptyText = "No tasks for this day.",
}: {
  phase: Phase;
  tasks: Task[];
  done: number;
  total: number;
  defaultOpen: boolean;
  isActive?: boolean;
  footer?: ReactNode;
  headerExtra?: ReactNode;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const c = phaseColor(phase.color);
  const submitted = !!phase.deliverable_submitted_at;

  return (
    <section
      className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface"
      aria-label={`Phase ${phase.number}: ${phase.name}`}
    >
      <div className="flex items-start gap-2 p-4 md:p-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span
            aria-hidden
            className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold", c.soft, c.text)}
          >
            {phase.number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold">{phase.name}</span>
              {isActive && <Pill className={cn(c.soft, c.text)}>Active</Pill>}
            </span>
            <span className="mt-0.5 block text-[13px] text-muted">
              {fmtRange(phase.start_date, phase.end_date)} · {done} / {total} done
            </span>
            <span
              className={cn(
                "mt-2 inline-flex max-w-full items-start gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold",
                submitted ? "bg-green-soft text-green-text" : "bg-orange-soft text-orange-text",
              )}
            >
              <FileCheck2 size={14} aria-hidden className="mt-px shrink-0" />
              <span>
                {submitted
                  ? `Submitted ${fmt(phase.deliverable_submitted_at!.slice(0, 10), "MMM d")}: `
                  : `Deliverable due ${fmt(phase.end_date, "MMM d")}: `}
                {phase.deliverable}
              </span>
            </span>
          </span>
          <ChevronDown
            size={20}
            aria-hidden
            className={cn("mt-2 shrink-0 text-muted transition-transform", open && "rotate-180")}
          />
        </button>
        {headerExtra}
      </div>
      <div className="px-4 md:px-5">
        <ProgressBar value={done} max={total} label={`Phase ${phase.number} progress`} fillClass={c.fill} className="mb-1" />
      </div>
      <div id={bodyId} hidden={!open} className="mt-3 bg-surface-2 px-3 py-2 md:px-4">
        {tasks.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted">{emptyText}</p>
        ) : (
          <TaskList tasks={tasks} label={`Phase ${phase.number} tasks`} />
        )}
        {footer}
      </div>
    </section>
  );
}
