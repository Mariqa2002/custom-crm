-- Per-user seed of the transition plan (spec section 7.4)

create or replace function public.seed_transition(uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p1 uuid; p2 uuid; p3 uuid; p4 uuid;
begin
  -- Safe to run twice
  if exists (select 1 from public.phases where user_id = uid) then
    return;
  end if;

  insert into public.phases (user_id, number, name, start_date, end_date, deliverable, color)
  values (uid, 1, 'Assessment & Inventory', '2026-11-16', '2026-11-20',
          'Complete Website Development Inventory and Assignment Register', 'accent')
  returning id into p1;

  insert into public.phases (user_id, number, name, start_date, end_date, deliverable, color)
  values (uid, 2, 'Knowledge Transfer & Handover', '2026-11-23', '2026-11-27',
          'Completed Technical Handover and Knowledge Transfer Records', 'green')
  returning id into p2;

  insert into public.phases (user_id, number, name, start_date, end_date, deliverable, color)
  values (uid, 3, 'Assignment Transfer & Operational Takeover', '2026-11-30', '2026-12-04',
          'Approved Website Assignment and Responsibility Register', 'purple')
  returning id into p3;

  insert into public.phases (user_id, number, name, start_date, end_date, deliverable, color)
  values (uid, 4, 'Monitoring & Stabilization', '2026-12-07', '2026-12-15',
          'Transition Completion and Assessment Report', 'orange')
  returning id into p4;

  -- Phase 1, with the Systems Analyst (due Nov 20)
  insert into public.tasks (user_id, phase_id, title, collaborator, due_date, sort_order, from_plan)
  select uid, p1, t.title, 'Systems Analyst', date '2026-11-20', t.ord, true
  from (values
    (1, 'Identify all government websites under development, maintenance or review'),
    (2, 'Identify outstanding website requests and assignments'),
    (3, 'Document the current status of each project'),
    (4, 'Identify the ministry, department or client for each'),
    (5, 'Record outstanding deliverables, technical challenges and dependencies'),
    (6, 'Identify project deadlines and previously agreed commitments'),
    (7, 'Identify hosting, domain, access requirements and technical documentation')
  ) as t(ord, title);

  -- Phase 2 (due Nov 27)
  insert into public.tasks (user_id, phase_id, title, due_date, sort_order, from_plan)
  select uid, p2, t.title, date '2026-11-27', t.ord, true
  from (values
    (1, 'Review website architecture and technical configurations'),
    (2, 'Verify CMS and administrative access arrangements'),
    (3, 'Review existing client communications and project requirements'),
    (4, 'Log outstanding issues, bugs and technical challenges'),
    (5, 'Note previous design decisions and stakeholder approvals')
  ) as t(ord, title);

  -- Phase 3 (due Dec 4)
  insert into public.tasks (user_id, phase_id, title, due_date, sort_order, from_plan)
  select uid, p3, t.title, date '2026-12-04', t.ord, true
  from (values
    (1, 'Review and acknowledge all transferred assignments'),
    (2, 'Become the primary technical contact for each assigned project'),
    (3, 'Take over project scheduling and implementation'),
    (4, 'Agree outstanding deliverables and revised completion dates')
  ) as t(ord, title);

  -- Phase 4 (due Dec 15)
  insert into public.tasks (user_id, phase_id, title, due_date, sort_order, from_plan)
  select uid, p4, t.title, date '2026-12-15', t.ord, true
  from (values
    (1, 'Report progress against assigned deliverables'),
    (2, 'Confirm every project has an owner and target completion date'),
    (3, 'Confirm technical documentation and access have been transferred'),
    (4, 'Raise any outstanding support requirements')
  ) as t(ord, title);

  -- Ongoing responsibilities (sections 3 and 6.3 of the plan)
  insert into public.responsibilities (user_id, body, sort_order)
  select uid, r.body, r.ord
  from (values
    (1, 'Review and acknowledge transferred assignments'),
    (2, 'Verify access to tools, repositories, platforms and hosting'),
    (3, 'Give regular updates to the e-Government Coordinator'),
    (4, 'Keep technical documentation and website records current'),
    (5, 'Escalate risks, delays and resource needs'),
    (6, 'Communicate directly with clients and stakeholders'),
    (7, 'Ensure completed websites meet technical, security, accessibility and usability standards')
  ) as r(ord, body);

  -- Assignment Register (client and target date left for her to fill in)
  insert into public.projects (user_id, name, client, status, outstanding_tasks, remarks, color)
  values
    (uid, 'gov.kn Homepage Redesign', null, 'in_progress',
     'Build the redesigned homepage in WordPress', null, '#0074F8'),
    (uid, 'Solarise Project', null, 'in_progress',
     'Switch the live site from JSON file storage to the backend database',
     'Done in test environment; live switch needs a downtime window', '#F89900');
end;
$$;

revoke execute on function public.seed_transition(uuid) from public, anon, authenticated;

-- Profile + seed for every new account
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;

  perform public.seed_transition(new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
