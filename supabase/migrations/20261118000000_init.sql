-- Transition Tracker: initial schema (spec sections 7.2 and 7.3)

-- Types
create type public.project_status as enum
  ('not_started','in_progress','under_review','pending_client_feedback','completed');
create type public.task_status as enum ('todo','in_progress','done');
create type public.report_status as enum ('draft','sent');

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin new.updated_at = now(); return new; end $$;

-- Profile (one row per user)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '',
  job_title text not null default 'Web Developer',
  theme text not null default 'system' check (theme in ('system','light','dark')),
  weekly_report_day smallint not null default 5 check (weekly_report_day between 1 and 7), -- ISO weekday, 5 = Fri
  transition_start date not null default '2026-11-16',
  transition_end date not null default '2026-12-15',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transition phases
create table public.phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  number smallint not null,
  name text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  deliverable text not null,
  deliverable_submitted_at timestamptz,
  color text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

-- Projects = rows of the Website Development Assignment Register (section 5 of the plan)
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  client text,                       -- Ministry / Department
  status public.project_status not null default 'not_started',
  outstanding_tasks text,
  target_date date,
  remarks text,                      -- issues, risks
  priority smallint check (priority between 1 and 5), -- set by the Coordinator
  color text not null default '#0074F8',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tasks (phase task, project task, or both)
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  phase_id uuid references public.phases on delete set null,
  project_id uuid references public.projects on delete set null,
  title text not null check (char_length(title) between 1 and 300),
  details text,
  collaborator text,                 -- e.g. 'Systems Analyst'
  status public.task_status not null default 'todo',
  due_date date,
  planned_for date,                  -- puts the task on Today for that date
  sort_order integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updates and notes
create table public.updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  task_id uuid references public.tasks on delete set null,
  project_id uuid references public.projects on delete set null,
  body text not null check (char_length(body) between 1 and 5000),
  include_in_report boolean not null default true,
  is_risk boolean not null default false,
  waiting_on_client boolean not null default false,
  resolved_at timestamptz,           -- set when a flagged risk is resolved
  happened_on date not null default ((now() at time zone 'America/St_Kitts')::date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extra schedule items (phase starts and deliverables come from phases)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  project_id uuid references public.projects on delete set null,
  title text not null,
  kind text not null default 'other' check (kind in ('meeting','deadline','report','other')),
  on_date date not null,
  starts_at time,
  ends_at time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ongoing responsibilities shown on the Dashboard
create table public.responsibilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  body text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saved weekly reports (content is a frozen snapshot)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  title text not null,
  summary text,                      -- her own opening paragraph
  content jsonb not null,
  status public.report_status not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_start)
);

-- Indexes
create index on public.tasks (user_id, planned_for);
create index on public.tasks (user_id, due_date);
create index on public.tasks (phase_id);
create index on public.tasks (project_id);
create index on public.updates (user_id, happened_on desc);
create index on public.updates (task_id);
create index on public.updates (project_id);
create index on public.events (user_id, on_date);
create index on public.events (project_id);
create index on public.projects (user_id, status);
create index on public.phases (user_id);
create index on public.responsibilities (user_id);

-- updated_at triggers
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.phases
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.updates
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.responsibilities
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- Keep tasks.completed_at in step with status
create or replace function public.sync_task_completed_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at = coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end $$;

create trigger sync_task_completed_at before insert or update of status on public.tasks
  for each row execute function public.sync_task_completed_at();

-- Linked rows must belong to the same user
create or replace function public.check_task_owner_links()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.phase_id is not null and not exists (
    select 1 from public.phases p where p.id = new.phase_id and p.user_id = new.user_id
  ) then
    raise exception 'phase_id does not belong to this user' using errcode = '42501';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id
  ) then
    raise exception 'project_id does not belong to this user' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger check_task_owner_links before insert or update on public.tasks
  for each row execute function public.check_task_owner_links();

create or replace function public.check_update_owner_links()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.task_id is not null and not exists (
    select 1 from public.tasks t where t.id = new.task_id and t.user_id = new.user_id
  ) then
    raise exception 'task_id does not belong to this user' using errcode = '42501';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id
  ) then
    raise exception 'project_id does not belong to this user' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger check_update_owner_links before insert or update on public.updates
  for each row execute function public.check_update_owner_links();

create or replace function public.check_event_owner_links()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id
  ) then
    raise exception 'project_id does not belong to this user' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger check_event_owner_links before insert or update on public.events
  for each row execute function public.check_event_owner_links();

-- Row Level Security: owner-only on every table
alter table public.profiles enable row level security;
alter table public.phases enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.updates enable row level security;
alter table public.events enable row level security;
alter table public.responsibilities enable row level security;
alter table public.reports enable row level security;

create policy "Owner can do everything" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Owner can do everything" on public.phases
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner can do everything" on public.projects
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner can do everything" on public.tasks
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner can do everything" on public.updates
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner can do everything" on public.events
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner can do everything" on public.responsibilities
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owner can do everything" on public.reports
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public revoke all on tables from anon;
