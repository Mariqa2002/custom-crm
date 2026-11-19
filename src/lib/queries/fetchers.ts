// Fetchers shared by server components (initial data) and client hooks.
// They take a Supabase client so the same code runs in both places.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import type {
  Event,
  Phase,
  Profile,
  Project,
  Report,
  Responsibility,
  Task,
  Update,
} from "../types";

export type DB = SupabaseClient<Database>;

export const keys = {
  profile: ["profile"] as const,
  phases: ["phases"] as const,
  tasks: ["tasks"] as const,
  projects: ["projects"] as const,
  updates: ["updates"] as const,
  events: ["events"] as const,
  responsibilities: ["responsibilities"] as const,
  reports: ["reports"] as const,
  search: (q: string) => ["search", q] as const,
};

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function list<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

export async function fetchProfile(sb: DB): Promise<Profile | null> {
  const res = await sb.from("profiles").select("*").maybeSingle();
  return must(res);
}

export async function fetchPhases(sb: DB): Promise<Phase[]> {
  return list(await sb.from("phases").select("*").order("number"));
}

export async function fetchTasks(sb: DB): Promise<Task[]> {
  return list(
    await sb
      .from("tasks")
      .select("*")
      .order("sort_order")
      .order("created_at"),
  );
}

export async function fetchProjects(sb: DB): Promise<Project[]> {
  return list(await sb.from("projects").select("*").order("created_at"));
}

export async function fetchUpdates(sb: DB): Promise<Update[]> {
  return list(
    await sb
      .from("updates")
      .select("*")
      .order("happened_on", { ascending: false })
      .order("created_at", { ascending: false }),
  );
}

export async function fetchEvents(sb: DB): Promise<Event[]> {
  return list(await sb.from("events").select("*").order("on_date").order("starts_at"));
}

export async function fetchResponsibilities(sb: DB): Promise<Responsibility[]> {
  return list(
    await sb.from("responsibilities").select("*").eq("active", true).order("sort_order"),
  );
}

export async function fetchReports(sb: DB): Promise<Report[]> {
  return list(
    await sb
      .from("reports")
      .select("*")
      .order("period_start", { ascending: false })
      .order("created_at", { ascending: false }),
  );
}
