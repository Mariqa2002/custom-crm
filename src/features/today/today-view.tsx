"use client";

import { CalendarDays, ChevronLeft, ChevronRight, FolderKanban, ListTodo, PenLine, Plus } from "lucide-react";
import { useId, useState } from "react";
import { CALENDAR_VIEWS, Calendar, stepCursor, type CalendarView } from "@/components/schedule/calendar";
import { SchedulePanel, useScheduleItems } from "@/components/schedule/schedule-panel";
import { PageHeader } from "@/components/shell/page-header";
import { PageWithAside } from "@/components/shell/page-layout";
import { PhaseSection } from "@/components/tasks/phase-section";
import { OpenTaskProvider, TaskList } from "@/components/tasks/task-list";
import { UpdateComposer } from "@/components/updates/composer";
import { Button, Card, CardHeader, ErrorState, IconButton, Input, Skeleton, cn } from "@/components/ui/primitives";
import { addDaysISO, dayOfTransition, fmt, todayISO, workWeek } from "@/lib/dates";
import { usePhases, usePhasesRetired, useProfile } from "@/lib/queries/misc";
import { useCreateTask, useTasks, useToday } from "@/lib/queries/tasks";
import { useLocalPref } from "@/lib/use-local-pref";

export function TodayView() {
  const today = todayISO();
  const [D, setD] = useState(today);
  const [mode, setMode] = useState<"day" | "calendar">("day");
  const [savedView, setCalView] = useLocalPref<CalendarView>("tt.calendar", "month");
  const calView: CalendarView = savedView && CALENDAR_VIEWS.includes(savedView) ? savedView : "month";
  const [cursor, setCursor] = useState(today);
  const profile = useProfile().data;
  const retired = usePhasesRetired();
  const { groups, isLoading, error, refetch } = useToday(D);
  const { items, taskItems } = useScheduleItems();
  const calendarOpen = mode === "calendar";
  const dayX = profile && !retired ? dayOfTransition(D, profile.transition_start) : null;
  const total = profile ? dayOfTransition(profile.transition_end, profile.transition_start) : 30;

  const openDay = (d: string) => {
    setD(d);
    setMode("day");
  };
  // The Today button opens the calendar at today; pressed again it closes it, back on today's list.
  const toggleCalendar = () => {
    setD(today);
    setCursor(today);
    setMode(calendarOpen ? "day" : "calendar");
  };
  const step = (dir: -1 | 1) =>
    calendarOpen ? setCursor(stepCursor(cursor, calView, dir)) : setD(addDaysISO(D, dir));
  const unit = calendarOpen ? calView : "day";

  const sub = calendarOpen ? (
    <>Your {calView} at a glance: tasks, meetings and deadlines</>
  ) : (
    <>
      {fmt(D, "EEEE, MMMM d, yyyy")}
      {dayX !== null && dayX >= 1 && dayX <= total && <> · Day {dayX} of {total}</>}
    </>
  );

  return (
    <OpenTaskProvider>
      <PageHeader
        title={calendarOpen ? "Calendar" : D === today ? "Today" : fmt(D, "EEEE")}
        sub={sub}
        search={false}
        actions={
          <div className="flex items-center gap-1">
            <IconButton label={`Previous ${unit}`} onClick={() => step(-1)}>
              <ChevronLeft size={20} aria-hidden />
            </IconButton>
            <Button
              size="sm"
              variant={calendarOpen ? "primary" : "secondary"}
              aria-pressed={calendarOpen}
              title={calendarOpen ? "Close the calendar and go back to today" : "Open the calendar"}
              onClick={toggleCalendar}
            >
              <CalendarDays size={16} aria-hidden /> Today
            </Button>
            <IconButton label={`Next ${unit}`} onClick={() => step(1)}>
              <ChevronRight size={20} aria-hidden />
            </IconButton>
          </div>
        }
      />
      <PageWithAside
        aside={<SchedulePanel day={D} />}
        asideHidden={calendarOpen}
        asideClassName={calendarOpen ? "hidden xl:block" : "hidden md:block"}
      >
        {calendarOpen ? (
          <Calendar
            view={calView}
            onView={setCalView}
            cursor={cursor}
            today={today}
            items={[...items, ...taskItems]}
            onPickDay={openDay}
            onPickMonth={(first) => {
              setCursor(first);
              setCalView("month");
            }}
            onClose={() => setMode("day")}
          />
        ) : (
          <>
            <DayStrip D={D} today={today} onPick={setD} retired={retired} />
            <p className="sr-only" aria-live="polite">
              {groups.openCount} open tasks for {fmt(D, "EEEE, MMMM d")}
            </p>

            {isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-48" />
              </div>
            ) : error ? (
              <Card>
                <ErrorState message={error.message} onRetry={refetch} />
              </Card>
            ) : (
              <>
                {groups.phases.map((g) => (
                  <PhaseSection
                    key={g.phase.id}
                    phase={g.phase}
                    tasks={g.tasks}
                    done={g.done}
                    total={g.total}
                    isActive={g.isActive}
                    defaultOpen
                  />
                ))}

                <Card aria-labelledby="proj-h">
                  <CardHeader
                    id="proj-h"
                    icon={<FolderKanban size={18} />}
                    title="Project tasks"
                    sub={D === today ? "Due or planned for today" : `Due or planned for ${fmt(D, "EEE, MMM d")}`}
                  />
                  <div className="px-3 pb-2 md:px-4">
                    {groups.project.length ? (
                      <TaskList tasks={groups.project} reorderable={false} label="Project tasks" />
                    ) : (
                      <p className="px-2 pb-3 text-sm text-muted">No project tasks due or planned for this day.</p>
                    )}
                  </div>
                </Card>

                <Card aria-labelledby="mine-h">
                  <CardHeader id="mine-h" icon={<ListTodo size={18} />} title="Your tasks" />
                  <div className="px-3 md:px-4">
                    {groups.other.length > 0 && <TaskList tasks={groups.other} label="Your tasks" />}
                    <AddTaskForm D={D} />
                  </div>
                </Card>

                <QuickUpdate />
              </>
            )}
          </>
        )}
      </PageWithAside>
    </OpenTaskProvider>
  );
}

function AddTaskForm({ D }: { D: string }) {
  const id = useId();
  const create = useCreateTask();
  const tasks = useTasks().data ?? [];
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();

  return (
    <form
      className="flex flex-col gap-2 py-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) {
          setError("Type a task first");
          return;
        }
        if (t.length > 300) {
          setError("Keep it under 300 characters");
          return;
        }
        const maxSort = Math.max(0, ...tasks.filter((x) => !x.phase_id && !x.project_id).map((x) => x.sort_order));
        create.mutate({ title: t, planned_for: D, sort_order: maxSort + 10 });
        setTitle("");
        setError(null);
      }}
    >
      <label htmlFor={`${id}-t`} className="sr-only">
        {D === today ? "Add a task for today" : `Add a task for ${fmt(D, "EEEE, MMMM d")}`}
      </label>
      <Input
        id={`${id}-t`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={D === today ? "Add a task for today" : `Add a task for ${fmt(D, "EEE, MMM d")}`}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-e` : undefined}
      />
      <Button type="submit" variant="primary" className="shrink-0">
        <Plus size={16} aria-hidden /> Add task
      </Button>
      {error && (
        <p id={`${id}-e`} role="alert" className="text-xs font-semibold text-orange-text sm:hidden">
          {error}
        </p>
      )}
    </form>
  );
}

function QuickUpdate() {
  const [open, setOpen] = useState(false);
  return (
    <Card aria-labelledby="quick-h">
      <CardHeader
        id="quick-h"
        icon={<PenLine size={18} />}
        title="Quick update"
        sub="A note that isn't tied to one task"
        action={
          !open && (
            <Button size="sm" onClick={() => setOpen(true)}>
              Write
            </Button>
          )
        }
      />
      {open && (
        <div className="px-5 pb-5">
          <UpdateComposer onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />
        </div>
      )}
    </Card>
  );
}

/** Mobile Mon–Fri strip; days with something due are tinted orange. */
function DayStrip({
  D,
  today,
  onPick,
  retired,
}: {
  D: string;
  today: string;
  onPick: (d: string) => void;
  retired: boolean;
}) {
  const tasks = useTasks().data ?? [];
  const phases = usePhases().data ?? [];
  const days = workWeek(D);
  const dueDays = new Set([
    ...tasks.filter((t) => t.due_date && t.status !== "done" && !t.archived_at).map((t) => t.due_date!),
    ...(retired ? [] : phases.map((p) => p.end_date)),
  ]);
  return (
    <nav aria-label="Pick a day" className="md:hidden">
      <ul className="grid grid-cols-5 gap-2">
        {days.map((d) => {
          const selected = d === D;
          const due = dueDays.has(d);
          return (
            <li key={d}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={`${fmt(d, "EEEE, MMMM d")}${due ? ", something due" : ""}${d === today ? ", today" : ""}`}
                onClick={() => onPick(d)}
                className={cn(
                  "flex h-16 w-full flex-col items-center justify-center rounded-xl border text-sm font-bold",
                  selected
                    ? "border-accent bg-accent text-on-accent"
                    : due
                      ? "border-transparent bg-orange-soft text-orange-text"
                      : "border-border bg-surface text-text",
                )}
              >
                <span className="text-[11px] font-semibold uppercase opacity-80">{fmt(d, "EEE")}</span>
                <span className="text-lg">{fmt(d, "d")}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
