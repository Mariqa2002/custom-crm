-- Fix: deleting a user failed with "Database error deleting user".
--
-- prevent_plan_task_delete blocks deleting plan tasks (archive them instead).
-- Deleting the auth user cascades to tasks, and the trigger blocked that too.
-- Only block direct deletes: when the delete comes from the foreign-key cascade
-- it runs inside the cascade's own trigger, so pg_trigger_depth() is above 1.

create or replace function public.prevent_plan_task_delete()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if old.from_plan and pg_trigger_depth() = 1 then
    raise exception 'Tasks from the transition plan cannot be deleted; archive them instead'
      using errcode = '42501';
  end if;
  return old;
end $$;
