-- Columns the feature spec needs that the base schema does not have.

-- 1. Plan tasks can be archived but not deleted (spec: Phases).
alter table public.tasks
  add column from_plan boolean not null default false,
  add column archived_at timestamptz;

create or replace function public.prevent_plan_task_delete()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if old.from_plan then
    raise exception 'Tasks from the transition plan cannot be deleted; archive them instead'
      using errcode = '42501';
  end if;
  return old;
end $$;

create trigger prevent_plan_task_delete before delete on public.tasks
  for each row execute function public.prevent_plan_task_delete();

-- 2. Register rows whose status changed this week are marked "changed" in the report.
alter table public.projects
  add column status_changed_at timestamptz;

create or replace function public.track_project_status_change()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end $$;

create trigger track_project_status_change before update of status on public.projects
  for each row execute function public.track_project_status_change();

-- 3. Sent reports are read-only and "Duplicate to edit" makes a new draft for the
--    same week, so only one *draft* per week is unique (sent copies may coexist).
alter table public.reports drop constraint reports_user_id_period_start_key;
create unique index reports_one_draft_per_week
  on public.reports (user_id, period_start) where status = 'draft';
create index on public.reports (user_id, period_start desc);

-- Sent reports cannot be edited (except to stay sent).
create or replace function public.lock_sent_reports()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'sent' then
    raise exception 'Sent reports are read-only; duplicate it to make changes'
      using errcode = '42501';
  end if;
  return new;
end $$;

create trigger lock_sent_reports before update on public.reports
  for each row execute function public.lock_sent_reports();

-- Realtime sync between devices (stretch goal in 7.5)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tasks, public.updates;
  end if;
end $$;
