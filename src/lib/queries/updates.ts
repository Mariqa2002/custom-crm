"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { todayISO } from "../dates";
import { createClient } from "../supabase/client";
import type { Update, UpdateInsert, UpdatePatch } from "../types";
import { fetchUpdates, keys } from "./fetchers";
import { check, errMessage, patchList, tempId } from "./shared";

export function useUpdates() {
  return useQuery({ queryKey: keys.updates, queryFn: () => fetchUpdates(createClient()) });
}

/** Save an update/note optimistically (spec 7.5). */
export function useCreateUpdate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: UpdateInsert) =>
      check(await createClient().from("updates").insert(input).select().single()),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.updates });
      const now = new Date().toISOString();
      const temp = {
        id: tempId(),
        user_id: "",
        task_id: null,
        project_id: null,
        include_in_report: true,
        is_risk: false,
        waiting_on_client: false,
        resolved_at: null,
        happened_on: todayISO(),
        created_at: now,
        updated_at: now,
        ...input,
      } as Update;
      return {
        rollback: patchList<Update>(qc, keys.updates, (l) => [temp, ...l]),
        tempId: temp.id,
      };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't save the update: ${errMessage(e)}` });
    },
    onSuccess: (row, _v, ctx) => {
      qc.setQueryData<Update[]>(keys.updates, (l) => l?.map((u) => (u.id === ctx?.tempId ? row : u)));
      toast({ tone: "success", message: "Update saved", duration: 2500 });
    },
  });
}

export function useEditUpdate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdatePatch }) =>
      check(await createClient().from("updates").update(patch).eq("id", id).select().single()),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.updates });
      return {
        rollback: patchList<Update>(qc, keys.updates, (l) =>
          l.map((u) => (u.id === id ? ({ ...u, ...patch } as Update) : u)),
        ),
      };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't save the update: ${errMessage(e)}` });
    },
    onSuccess: (row) =>
      qc.setQueryData<Update[]>(keys.updates, (l) => l?.map((u) => (u.id === row.id ? row : u))),
  });
}

export function useDeleteUpdate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return (u: Update) => {
    const rollback = patchList<Update>(qc, keys.updates, (l) => l.filter((x) => x.id !== u.id));
    let undone = false;
    toast({
      message: "Update deleted",
      action: {
        label: "Undo",
        onClick: () => {
          undone = true;
          rollback();
        },
      },
    });
    window.setTimeout(async () => {
      if (undone) return;
      const { error } = await createClient().from("updates").delete().eq("id", u.id);
      if (error) {
        rollback();
        toast({ tone: "error", message: `Couldn't delete: ${error.message}` });
      }
    }, 5000);
  };
}
