"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { createClient } from "../supabase/client";
import type { Project, ProjectInsert, ProjectPatch } from "../types";
import { fetchProjects, keys } from "./fetchers";
import { check, errMessage, patchList, tempId } from "./shared";

export function useProjects() {
  return useQuery({ queryKey: keys.projects, queryFn: () => fetchProjects(createClient()) });
}

/** Non-archived projects, the ones that count as "in the register". */
export function useActiveProjects() {
  const q = useProjects();
  return { ...q, data: q.data?.filter((p) => !p.archived_at) };
}

export function useCreateProject() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: ProjectInsert) =>
      check(await createClient().from("projects").insert(input).select().single()),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.projects });
      const now = new Date().toISOString();
      const temp = {
        id: tempId(),
        user_id: "",
        client: null,
        status: "not_started",
        outstanding_tasks: null,
        target_date: null,
        remarks: null,
        priority: null,
        color: "#0074F8",
        archived_at: null,
        status_changed_at: null,
        created_at: now,
        updated_at: now,
        ...input,
      } as Project;
      return {
        rollback: patchList<Project>(qc, keys.projects, (l) => [...l, temp]),
        tempId: temp.id,
      };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't add the project: ${errMessage(e)}` });
    },
    onSuccess: (row, _v, ctx) =>
      qc.setQueryData<Project[]>(keys.projects, (l) =>
        l?.map((p) => (p.id === ctx?.tempId ? row : p)),
      ),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ProjectPatch }) =>
      check(await createClient().from("projects").update(patch).eq("id", id).select().single()),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.projects });
      return {
        rollback: patchList<Project>(qc, keys.projects, (l) =>
          l.map((p) => (p.id === id ? ({ ...p, ...patch } as Project) : p)),
        ),
      };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't save the project: ${errMessage(e)}` });
    },
    onSuccess: (row) =>
      qc.setQueryData<Project[]>(keys.projects, (l) => l?.map((p) => (p.id === row.id ? row : p))),
  });
}
