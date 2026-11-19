"use client";

import { addMonths, addYears, endOfMonth, format, startOfMonth } from "date-fns";
import { X } from "lucide-react";
import { addDaysISO, day, fmt, fmtRange, toISO, weekMonday } from "@/lib/dates";
import { itemsOnDay, type ScheduleItem } from "@/lib/schedule";
import { IconButton, cn } from "../ui/primitives";

export type CalendarView = "week" | "month" | "year";
export const CALENDAR_VIEWS: CalendarView[] = ["week", "month", "year"];

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Move the calendar one period back (-1) or forward (+1). */
export function stepCursor(cursor: string, view: CalendarView, dir: -1 | 1): string {
  if (view === "week") return addDaysISO(cursor, 7 * dir);
  if (view === "month") return toISO(addMonths(startOfMonth(day(cursor)), dir));
  return toISO(addYears(day(cursor), dir));
}

/** "Nov 16–22, 2026" / "November 2026" / "2026". */
export function calendarLabel(cursor: string, view: CalendarView): string {
  if (view === "week") {
    const mon = weekMonday(cursor);
    return fmtRange(mon, addDaysISO(mon, 6));
  }
  return fmt(cursor, view === "month" ? "MMMM yyyy" : "yyyy");
}

/** 6 rows × 7 days covering the month that contains `cursor`, starting on a Monday. */
function monthGrid(cursor: string): string[] {
  const first = weekMonday(toISO(startOfMonth(day(cursor))));
  return Array.from({ length: 42 }, (_, i) => addDaysISO(first, i));
}

export function Calendar({
  view,
  onView,
  cursor,
  today,
  items,
  onPickDay,
  onPickMonth,
  onClose,
}: {
  view: CalendarView;
  onView: (v: CalendarView) => void;
  cursor: string;
  today: string;
  items: ScheduleItem[];
  onPickDay: (d: string) => void;
  onPickMonth: (firstOfMonth: string) => void;
  onClose: () => void;
}) {
  return (
    <section
      aria-label={`Calendar, ${calendarLabel(cursor, view)}`}
      className="animate-[cal-in_300ms_ease-out] rounded-[var(--radius-card)] border border-border bg-surface shadow-card"
    >
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4 pb-3 md:px-5">
        <h2 className="min-w-0 flex-1 text-lg font-extrabold" aria-live="polite">
          {calendarLabel(cursor, view)}
        </h2>
        <div role="group" aria-label="Calendar view" className="flex rounded-xl bg-surface-2 p-1">
          {CALENDAR_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => onView(v)}
              className={cn(
                "h-9 rounded-lg px-3 text-[13px] font-semibold capitalize",
                view === v ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <IconButton label="Close calendar" onClick={onClose}>
          <X size={18} aria-hidden />
        </IconButton>
      </div>
      <div className="px-3 pb-4 md:px-5">
        {view === "week" && <WeekGrid cursor={cursor} today={today} items={items} onPickDay={onPickDay} />}
        {view === "month" && <MonthGrid cursor={cursor} today={today} items={items} onPickDay={onPickDay} />}
        {view === "year" && (
          <YearGrid cursor={cursor} today={today} items={items} onPickDay={onPickDay} onPickMonth={onPickMonth} />
        )}
      </div>
      <p className="border-t border-line px-5 py-3 text-xs text-muted">Pick a day to open its task list.</p>
    </section>
  );
}

function Chip({ item }: { item: ScheduleItem }) {
  return (
    <li
      className="truncate rounded-md border-l-[3px] bg-surface-2 px-1.5 py-0.5 text-[11px] leading-4 font-semibold"
      style={{ borderLeftColor: item.color }}
      title={item.sub ? `${item.title} · ${item.sub}` : item.title}
    >
      <span className={cn(item.done && "text-muted line-through")}>
        {item.time && <span className="mr-1 font-normal text-muted">{item.time.slice(0, 5)}</span>}
        {item.title}
      </span>
    </li>
  );
}

function dayLabel(d: string, count: number, today: string) {
  return `${fmt(d, "EEEE, MMMM d")}${d === today ? ", today" : ""}, ${count ? `${count} ${count === 1 ? "item" : "items"}` : "nothing scheduled"}`;
}

function WeekGrid({
  cursor,
  today,
  items,
  onPickDay,
}: {
  cursor: string;
  today: string;
  items: ScheduleItem[];
  onPickDay: (d: string) => void;
}) {
  const mon = weekMonday(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(mon, i));
  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((d) => {
        const list = itemsOnDay(items, d);
        const isToday = d === today;
        return (
          <li key={d} className="min-w-0">
            <button
              type="button"
              onClick={() => onPickDay(d)}
              aria-label={dayLabel(d, list.length, today)}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex h-full min-h-20 w-full flex-col gap-2 rounded-xl border p-2 text-left transition-colors hover:border-accent sm:min-h-64",
                isToday ? "border-now bg-surface" : "border-line bg-surface-2/60",
              )}
            >
              <span className="flex items-baseline gap-1.5">
                <span className={cn("text-xs font-bold uppercase", isToday ? "text-now" : "text-muted")}>
                  {fmt(d, "EEE")}
                </span>
                <span className={cn("text-lg font-extrabold", isToday && "text-now")}>{fmt(d, "d")}</span>
              </span>
              <ul className="flex min-w-0 flex-col gap-1" aria-hidden>
                {list.map((i) => (
                  <Chip key={i.id} item={i} />
                ))}
              </ul>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function MonthGrid({
  cursor,
  today,
  items,
  onPickDay,
}: {
  cursor: string;
  today: string;
  items: ScheduleItem[];
  onPickDay: (d: string) => void;
}) {
  const month = fmt(cursor, "yyyy-MM");
  const days = monthGrid(cursor);
  // Drop a trailing week that's entirely next month.
  const shown = days.slice(35).every((d) => !d.startsWith(month)) ? days.slice(0, 35) : days;
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 pb-1" aria-hidden>
        {WEEKDAY_SHORT.map((w) => (
          <span key={w} className="px-1 text-center text-[11px] font-bold text-muted uppercase sm:text-left">
            <span className="sm:hidden">{w[0]}</span>
            <span className="max-sm:hidden">{w}</span>
          </span>
        ))}
      </div>
      <ol className="grid grid-cols-7 gap-1">
        {shown.map((d) => {
          const list = itemsOnDay(items, d);
          const inMonth = d.startsWith(month);
          const isToday = d === today;
          return (
            <li key={d} className="min-w-0">
              <button
                type="button"
                onClick={() => onPickDay(d)}
                aria-label={dayLabel(d, list.length, today)}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex h-14 w-full flex-col items-center gap-1 rounded-lg border p-1 text-left transition-colors hover:border-accent sm:h-28 sm:items-stretch sm:p-1.5",
                  inMonth ? "border-line bg-surface" : "border-transparent bg-surface-2/50 text-muted",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                    isToday && "bg-now text-on-accent",
                  )}
                >
                  {fmt(d, "d")}
                </span>
                {/* Phone: dots. Wider: up to three chips. */}
                <span className="flex gap-0.5 sm:hidden" aria-hidden>
                  {list.slice(0, 3).map((i) => (
                    <span key={i.id} className="size-1.5 rounded-full" style={{ background: i.color }} />
                  ))}
                </span>
                <ul className="flex min-w-0 flex-col gap-0.5 max-sm:hidden" aria-hidden>
                  {list.slice(0, 3).map((i) => (
                    <Chip key={i.id} item={i} />
                  ))}
                  {list.length > 3 && (
                    <li className="px-1 text-[11px] font-semibold text-muted">+{list.length - 3} more</li>
                  )}
                </ul>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function YearGrid({
  cursor,
  today,
  items,
  onPickDay,
  onPickMonth,
}: {
  cursor: string;
  today: string;
  items: ScheduleItem[];
  onPickDay: (d: string) => void;
  onPickMonth: (firstOfMonth: string) => void;
}) {
  const year = day(cursor).getFullYear();
  const busy = new Set(items.map((i) => i.date));
  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => {
        const first = toISO(new Date(year, m, 1));
        const last = toISO(endOfMonth(day(first)));
        const month = first.slice(0, 7);
        const days = monthGrid(first).filter((d, i) => i < 35 || d <= last);
        return (
          <li key={m} className="rounded-xl border border-line p-3">
            <button
              type="button"
              onClick={() => onPickMonth(first)}
              className="mb-2 rounded-md px-1 text-sm font-bold hover:text-accent-text"
            >
              {format(day(first), "MMMM")}
            </button>
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-muted" aria-hidden>
              {WEEKDAY_SHORT.map((w) => (
                <span key={w}>{w[0]}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 text-center">
              {days.map((d) =>
                d.startsWith(month) ? (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onPickDay(d)}
                    aria-label={dayLabel(d, itemsOnDay(items, d).length, today)}
                    aria-current={d === today ? "date" : undefined}
                    className={cn(
                      "relative mx-auto grid size-7 place-items-center rounded-full text-xs hover:bg-surface-2",
                      d === today ? "bg-now font-bold text-on-accent hover:bg-now" : busy.has(d) && "font-bold text-accent-text",
                    )}
                  >
                    {Number(d.slice(8))}
                    {busy.has(d) && d !== today && (
                      <span aria-hidden className="absolute bottom-0.5 size-1 rounded-full bg-accent" />
                    )}
                  </button>
                ) : (
                  <span key={d} aria-hidden />
                ),
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
