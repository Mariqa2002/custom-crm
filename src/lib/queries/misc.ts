"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { createClient } from "../supabase/client";
import type { Event, EventInsert, Phase, Profile, Responsibility } from "../types";
import {
  fetchEvents,
  fetchPhases,
  fetchProfile,
  fetchResponsibilities,
  keys,
} from "./fetchers";
import { check, errMessage, patchList, tempId } from "./shared";

// Profile -------------------------------------------------------------------

export function useProfile() {
  return useQuery({ queryKey: keys.profile, queryFn: () => fetchProfile(createClient()) });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (patch: Partial<Profile>) => {
      const sb = createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) throw new Error("Not signed in");
      return check(await sb.from("profiles").update(patch).eq("id", user.id).select().single());
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: keys.profile });
      const prev = qc.getQueryData<Profile | null>(keys.profile);
      if (prev) qc.setQueryData(keys.profile, { ...prev, ...patch });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      qc.setQueryData(keys.profile, ctx?.prev);
      toast({ tone: "error", message: `Couldn't save settings: ${errMessage(e)}` });
    },
    onSuccess: (row) => qc.setQueryData(keys.profile, row),
  });
}

/** True once she has retired the transition phases (see Settings). */
export function usePhasesRetired() {
  return !!useProfile().data?.phases_retired_at;
}

// Phases --------------------------------------------------------------------

export function usePhases() {
  return useQuery({ queryKey: keys.phases, queryFn: () => fetchPhases(createClient()) });
}

export function useUpdatePhase() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Phase> }) =>
      check(await createClient().from("phases").update(patch).eq("id", id).select().single()),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.phases });
      return {
        rollback: patchList<Phase>(qc, keys.phases, (l) =>
          l.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        ),
      };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't save the phase: ${errMessage(e)}` });
    },
    onSuccess: (row) =>
      qc.setQueryData<Phase[]>(keys.phases, (l) => l?.map((p) => (p.id === row.id ? row : p))),
  });
}

// Responsibilities ------------------------------------------------------------

export function useResponsibilities() {
  return useQuery({
    queryKey: keys.responsibilities,
    queryFn: () => fetchResponsibilities(createClient()),
  });
}

export function useCreateResponsibility() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { body: string; sort_order: number }) =>
      check(await createClient().from("responsibilities").insert(input).select().single()),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.responsibilities });
      const now = new Date().toISOString();
      const temp: Responsibility = { id: tempId(), user_id: "", active: true, created_at: now, updated_at: now, ...input };
      return {
        rollback: patchList<Responsibility>(qc, keys.responsibilities, (l) => [...l, temp]),
        tempId: temp.id,
      };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't add the responsibility: ${errMessage(e)}` });
    },
    onSuccess: (row, _v, ctx) =>
      qc.setQueryData<Responsibility[]>(keys.responsibilities, (l) =>
        l?.map((r) => (r.id === ctx?.tempId ? row : r)),
      ),
  });
}

export function useUpdateResponsibility() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Responsibility, "body" | "sort_order">> }) =>
      check(await createClient().from("responsibilities").update(patch).eq("id", id).select().single()),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.responsibilities });
      return {
        rollback: patchList<Responsibility>(qc, keys.responsibilities, (l) =>
          l.map((r) => (r.id === id ? { ...r, ...patch } : r)).sort((a, b) => a.sort_order - b.sort_order),
        ),
      };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't save the responsibility: ${errMessage(e)}` });
    },
  });
}

export function useDeleteResponsibility() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("responsibilities").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.responsibilities });
      return { rollback: patchList<Responsibility>(qc, keys.responsibilities, (l) => l.filter((r) => r.id !== id)) };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't delete the responsibility: ${errMessage(e)}` });
    },
  });
}

// Events ------------------------------------------------------------------------

export function useEvents() {
  return useQuery({ queryKey: keys.events, queryFn: () => fetchEvents(createClient()) });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: EventInsert) =>
      check(await createClient().from("events").insert(input).select().single()),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.events });
      const now = new Date().toISOString();
      const temp = {
        id: tempId(),
        user_id: "",
        project_id: null,
        kind: "other",
        starts_at: null,
        ends_at: null,
        created_at: now,
        updated_at: now,
        ...input,
      } as Event;
      return { rollback: patchList<Event>(qc, keys.events, (l) => [...l, temp]), tempId: temp.id };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't add the event: ${errMessage(e)}` });
    },
    onSuccess: (row, _v, ctx) =>
      qc.setQueryData<Event[]>(keys.events, (l) => l?.map((ev) => (ev.id === ctx?.tempId ? row : ev))),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("events").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onMutate: async (id) => ({
      rollback: patchList<Event>(qc, keys.events, (l) => l.filter((e) => e.id !== id)),
    }),
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't delete the event: ${errMessage(e)}` });
    },
  });
}
