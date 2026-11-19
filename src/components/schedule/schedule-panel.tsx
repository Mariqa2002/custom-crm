"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, Check, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EVENT_KINDS } from "@/lib/constants";
import { addDaysISO, fmt, todayISO, weekMonday, withoutCompletedPhaseTasks, workWeek } from "@/lib/dates";
import { useCreateEvent, useDeleteEvent, useEvents, usePhases, usePhasesRetired } from "@/lib/queries/misc";
import { useActiveProjects, useProjects } from "@/lib/queries/projects";
import { useTasks } from "@/lib/queries/tasks";
import { buildScheduleItems, groupTimeline, itemsOnDay, taskScheduleItems, type ScheduleItem } from "@/lib/schedule";
import { useLocalPref } from "@/lib/use-local-pref";
import { Modal } from "../ui/modal";
import { Button, Card, Field, IconButton, Input, Select, cn } from "../ui/primitives";

const NONE: never[] = [];

/** Phase dates (until retired), events, and tasks on their planned and due days. */
export function useScheduleItems() {
  const phases = usePhases().data ?? NONE;
  const events = useEvents().data ?? NONE;
  const projects = useProjects().data ?? NONE;
  const tasks = useTasks().data ?? NONE;
  const retired = usePhasesRetired();
  const items = useMemo(
    () => buildScheduleItems(phases, events, projects, { includePhases: !retired }),
    [phases, events, projects, retired],
  );
  const taskItems = useMemo(
    () => taskScheduleItems(withoutCompletedPhaseTasks(tasks, phases), projects),
    [tasks, phases, projects],
  );
  return { items, taskItems };
}

/**
 * Right-hand Schedule card. With `day`, it lists only that day (Today page);
 * otherwise it offers the Timeline / Week views (Dashboard).
 */
export function SchedulePanel({ className, day }: { className?: string; day?: string }) {
  const [view, setView] = useLocalPref<"timeline" | "week">("tt.schedule", "timeline");
  const [adding, setAdding] = useState(false);
  const { items, taskItems } = useScheduleItems();
  const today = todayISO();

  return (
    <Card className={cn("flex flex-col", className)} aria-labelledby="schedule-title" id="schedule">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3">
        <h2 id="schedule-title" className="flex-1 text-[15px] font-bold">
          Schedule
          {day && (
            <span className="block text-[13px] font-semibold text-muted">
              {day === today ? "Today, " : ""}
              {fmt(day, "EEEE, MMM d")}
            </span>
          )}
        </h2>
        {!day && (
          <div role="group" aria-label="Schedule view" className="flex rounded-xl bg-surface-2 p-1">
            {(["timeline", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "h-9 rounded-lg px-3 text-[13px] font-semibold capitalize",
                  view === v ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-5 pb-3">
        {day ? (
          <DayView items={itemsOnDay([...items, ...taskItems], day)} />
        ) : view === "week" ? (
          <WeekView items={[...items, ...taskItems]} today={today} />
        ) : (
          <TimelineView items={items} today={today} />
        )}
      </div>
      <div className="mt-auto border-t border-line px-5 py-3">
        <Button variant="ghost" className="w-full" onClick={() => setAdding(true)}>
          <CalendarPlus size={16} aria-hidden /> Add event
        </Button>
      </div>
      <AddEventModal key={day ?? today} open={adding} onClose={() => setAdding(false)} defaultDate={day ?? today} />
    </Card>
  );
}

function DayView({ items }: { items: ScheduleItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Nothing scheduled for this day.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((i) => (
        <ItemRow key={i.id} item={i} hideDate />
      ))}
    </ul>
  );
}

function ItemRow({ item, hideDate }: { item: ScheduleItem; hideDate?: boolean }) {
  const del = useDeleteEvent();
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        aria-hidden
        className="mt-1 grid size-4 shrink-0 place-items-center rounded-full"
        style={{ background: item.color }}
      >
        {item.done && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", item.done && "text-muted line-through")}>
          {item.title}
          {item.done && <span className="sr-only"> ({item.kind === "task" ? "done" : "submitted"})</span>}
        </p>
        {item.sub && <p className="truncate text-xs text-muted">{item.sub}</p>}
      </div>
      <span className="shrink-0 text-right text-xs font-semibold text-muted">
        {!hideDate && fmt(item.date, "EEE, MMM d")}
        {item.time && <span className={cn("block", !hideDate && "font-normal")}>{item.time}</span>}
      </span>
      {item.eventId && (
        <IconButton
          label={`Delete event ${item.title}`}
          className="-my-2 -mr-3 size-9"
          onClick={() => del.mutate(item.eventId!)}
        >
          <Trash2 size={14} aria-hidden />
        </IconButton>
      )}
    </li>
  );
}

function TimelineView({ items, today }: { items: ScheduleItem[]; today: string }) {
  const g = groupTimeline(items, today);
  const sections = [
    { title: "This week", items: g.thisWeek },
    { title: "Next week", items: g.nextWeek },
    { title: "Later", items: g.later },
  ];
  if (sections.every((s) => s.items.length === 0)) {
    return <p className="py-6 text-center text-sm text-muted">Nothing scheduled ahead.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {sections.map(
        (s) =>
          s.items.length > 0 && (
            <section key={s.title} aria-label={s.title}>
              <h3 className="text-[11px] font-bold tracking-wider text-muted uppercase">{s.title}</h3>
              <ul className="divide-y divide-line">
                {s.items.map((i) => (
                  <ItemRow key={i.id} item={i} />
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}

function WeekView({ items, today }: { items: ScheduleItem[]; today: string }) {
  const [monday, setMonday] = useState(weekMonday(today));
  const days = workWeek(monday);
  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <IconButton label="Previous week" onClick={() => setMonday(addDaysISO(monday, -7))}>
          <ChevronLeft size={18} aria-hidden />
        </IconButton>
        <p className="flex-1 text-center text-sm font-semibold" aria-live="polite">
          {fmt(days[0], "MMM d")} – {fmt(days[4], "MMM d")}
        </p>
        <IconButton label="Next week" onClick={() => setMonday(addDaysISO(monday, 7))}>
          <ChevronRight size={18} aria-hidden />
        </IconButton>
      </div>
      <ol className="flex flex-col">
        {days.map((d) => {
          const isToday = d === today;
          const dayItems = items.filter((i) => i.date === d);
          return (
            <li
              key={d}
              aria-current={isToday ? "date" : undefined}
              className="relative flex gap-3 border-b border-line py-2.5 last:border-b-0"
            >
              {isToday && (
                <span aria-hidden className="absolute top-0 right-0 left-0 h-0.5 rounded bg-now" />
              )}
              <div className="w-12 shrink-0">
                <p className={cn("text-xs font-bold uppercase", isToday ? "text-now" : "text-muted")}>
                  {fmt(d, "EEE")}
                </p>
                <p className={cn("text-lg font-extrabold", isToday && "text-now")}>{fmt(d, "d")}</p>
                {isToday && <span className="text-[10px] font-bold text-now uppercase">Today</span>}
              </div>
              <ul className="flex min-w-0 flex-1 flex-col gap-1">
                {dayItems.length === 0 && <li className="py-1 text-xs text-muted">—</li>}
                {dayItems.map((i) => (
                  <li
                    key={i.id}
                    className="truncate rounded-lg border-l-4 bg-surface-2 px-2 py-1 text-xs font-semibold"
                    style={{ borderLeftColor: i.color }}
                    title={i.sub ? `${i.title} · ${i.sub}` : i.title}
                  >
                    <span className={cn(i.done && "text-muted line-through")}>
                      {i.time && <span className="mr-1 font-normal text-muted">{i.time}</span>}
                      {i.title}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Give the event a title").max(200),
    on_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    starts_at: z.string(),
    ends_at: z.string(),
    kind: z.enum(["meeting", "deadline", "report", "other"]),
    project_id: z.string(),
  })
  .refine((v) => !v.ends_at || !v.starts_at || v.ends_at >= v.starts_at, {
    path: ["ends_at"],
    message: "End time is before the start",
  });

export function AddEventModal({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
}) {
  const id = useId();
  const create = useCreateEvent();
  const projects = useActiveProjects().data ?? [];
  const form = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
    defaultValues: { title: "", on_date: defaultDate ?? todayISO(), starts_at: "", ends_at: "", kind: "meeting", project_id: "" },
  });
  const err = form.formState.errors;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add event"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={`${id}-f`}>
            Add event
          </Button>
        </>
      }
    >
      <form
        id={`${id}-f`}
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit((v) => {
          create.mutate({
            title: v.title.trim(),
            on_date: v.on_date,
            starts_at: v.starts_at || null,
            ends_at: v.ends_at || null,
            kind: v.kind,
            project_id: v.project_id || null,
          });
          form.reset({ ...v, title: "", starts_at: "", ends_at: "" });
          onClose();
        })}
      >
        <Field label="Title" htmlFor={`${id}-t`} error={err.title?.message} className="sm:col-span-2">
          <Input id={`${id}-t`} autoFocus {...form.register("title")} />
        </Field>
        <Field label="Date" htmlFor={`${id}-d`} error={err.on_date?.message}>
          <Input id={`${id}-d`} type="date" {...form.register("on_date")} />
        </Field>
        <Field label="Kind" htmlFor={`${id}-k`}>
          <Select id={`${id}-k`} {...form.register("kind")}>
            {EVENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start time (optional)" htmlFor={`${id}-s`}>
          <Input id={`${id}-s`} type="time" {...form.register("starts_at")} />
        </Field>
        <Field label="End time (optional)" htmlFor={`${id}-e`} error={err.ends_at?.message}>
          <Input id={`${id}-e`} type="time" {...form.register("ends_at")} />
        </Field>
        <Field label="Project (optional)" htmlFor={`${id}-p`} className="sm:col-span-2">
          <Select id={`${id}-p`} {...form.register("project_id")}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
