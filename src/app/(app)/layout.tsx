import { HydrationBoundary, QueryClient, dehydrate } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/setup-notice";
import { AppShell } from "@/components/shell/app-shell";
import {
  fetchEvents,
  fetchPhases,
  fetchProfile,
  fetchProjects,
  fetchResponsibilities,
  fetchTasks,
  fetchUpdates,
  keys,
} from "@/lib/queries/fetchers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

/**
 * Signed-in area. Loads the first data on the server and hands it to
 * TanStack Query, so Dashboard and Today render filled with no loading flash.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return <SetupNotice />;
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const qc = new QueryClient();
  await Promise.all([
    qc.prefetchQuery({ queryKey: keys.profile, queryFn: () => fetchProfile(supabase) }),
    qc.prefetchQuery({ queryKey: keys.phases, queryFn: () => fetchPhases(supabase) }),
    qc.prefetchQuery({ queryKey: keys.tasks, queryFn: () => fetchTasks(supabase) }),
    qc.prefetchQuery({ queryKey: keys.projects, queryFn: () => fetchProjects(supabase) }),
    qc.prefetchQuery({ queryKey: keys.updates, queryFn: () => fetchUpdates(supabase) }),
    qc.prefetchQuery({ queryKey: keys.events, queryFn: () => fetchEvents(supabase) }),
    qc.prefetchQuery({
      queryKey: keys.responsibilities,
      queryFn: () => fetchResponsibilities(supabase),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(qc)}>
      <AppShell>{children}</AppShell>
    </HydrationBoundary>
  );
}
