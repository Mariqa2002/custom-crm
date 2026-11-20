-- Retiring the transition plan once every phase is complete.
--
-- A phase counts as complete when its deliverable is submitted
-- (phases.deliverable_submitted_at). Completed phases leave the Phases page.
-- When all of them are complete she can retire the plan: the app then hides
-- the Phases tab and every phase-related card and runs as a plain task tracker.
--
-- Nothing is deleted. Phases, their tasks and past reports stay in the
-- database (and in "Export my data"), and clearing this column brings the
-- phases back. RLS on profiles already limits this to her own row.

alter table public.profiles
  add column phases_retired_at timestamptz;

comment on column public.profiles.phases_retired_at is
  'When the transition phases were retired. Null = phases are shown.';
