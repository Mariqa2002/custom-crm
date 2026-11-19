import type { ProjectStatus } from "./types";

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "under_review", label: "Under Review" },
  { value: "pending_client_feedback", label: "Pending Client Feedback" },
  { value: "completed", label: "Completed" },
];

export const STATUS_LABEL: Record<ProjectStatus, string> = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s.label]),
) as Record<ProjectStatus, string>;

/** Pill classes per status (section 5). Words always accompany the colour. */
export const STATUS_PILL: Record<ProjectStatus, string> = {
  in_progress: "bg-accent-soft text-accent-text",
  not_started: "bg-surface-2 text-muted border border-border",
  under_review: "bg-purple-soft text-purple-text",
  pending_client_feedback: "bg-orange-soft text-orange-text",
  completed: "bg-green-soft text-green-text",
};

/** Phase colour tokens stored in phases.color → literal Tailwind classes.
 *  Phases run blue → green → purple → orange. "teal" and "pink" are the
 *  original seed names, kept as aliases so older rows still map. */
const GREEN = {
  text: "text-green-text",
  soft: "bg-green-soft",
  fill: "bg-green",
  border: "border-green",
  dot: "var(--green)",
};
const ORANGE = {
  text: "text-orange-text",
  soft: "bg-orange-soft",
  fill: "bg-orange",
  border: "border-orange",
  dot: "var(--orange)",
};
export const PHASE_COLOR: Record<
  string,
  { text: string; soft: string; fill: string; border: string; dot: string }
> = {
  accent: {
    text: "text-accent-text",
    soft: "bg-accent-soft",
    fill: "bg-accent",
    border: "border-accent",
    dot: "var(--accent)",
  },
  green: GREEN,
  teal: GREEN,
  purple: {
    text: "text-purple-text",
    soft: "bg-purple-soft",
    fill: "bg-purple",
    border: "border-purple",
    dot: "var(--purple)",
  },
  orange: ORANGE,
  pink: ORANGE,
};

export function phaseColor(color: string | null | undefined) {
  return PHASE_COLOR[color ?? "accent"] ?? PHASE_COLOR.accent;
}

/** The 8 project colour presets: the four brand accents first, then matches. */
export const PROJECT_COLORS: { value: string; name: string }[] = [
  { value: "#0074F8", name: "Blue" },
  { value: "#CB00F4", name: "Purple" },
  { value: "#79E21F", name: "Green" },
  { value: "#F89900", name: "Orange" },
  { value: "#00B8C4", name: "Cyan" },
  { value: "#F0388C", name: "Pink" },
  { value: "#5B4BFF", name: "Indigo" },
  { value: "#64748B", name: "Slate" },
];

export const EVENT_KINDS = [
  { value: "meeting", label: "Meeting" },
  { value: "deadline", label: "Deadline" },
  { value: "report", label: "Weekly update" },
  { value: "other", label: "Other" },
] as const;

export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

export const ACCESS_HINT = "Record that access was verified, not the password.";
const ACCESS_RE = /\b(access|credential|login|log-in|password|cms|hosting|repositor|admin)/i;
export function isAccessTask(title: string) {
  return ACCESS_RE.test(title);
}
