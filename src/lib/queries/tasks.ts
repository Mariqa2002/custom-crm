"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useToast } from "@/components/ui/toast";
import { groupTodayTasks } from "../dates";
import { createClient } from "../supabase/client";
import type { Task, TaskInsert, TaskPatch } from "../types";
import { fetchTasks, keys } from "./fetchers";
import { usePhases, usePhasesRetired } from "./misc";
import { check, errMessage, patchList, tempId } from "./shared";

export function useTasks() {
  return useQuery({ queryKey: keys.tasks, queryFn: () => fetchTasks(createClient()) });
}

/** Tasks for day D grouped per the Today inclusion rules. */
export function useToday(D: string) {
  const tasks = useTasks();
  const phases = usePhases();
  const retired = usePhasesRetired();
  const groups = useMemo(
    () => groupTodayTasks(tasks.data ?? [], phases.data ?? [], D, { retired }),
    [tasks.data, phases.data, D, retired],
  );
  return {
    groups,
    isLoading: tasks.isLoading || phases.isLoading,
    error: tasks.error ?? phases.error,
    refetch: () => {
      void tasks.refetch();
      void phases.refetch();
    },
  };
}

/** Patch a task optimistically; rolls back and shows a toast on failure. */
export function useUpdateTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TaskPatch }) =>
      check(await createClient().from("tasks").update(patch).eq("id", id).select().single()),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: keys.tasks });
      const rollback = patchList<Task>(qc, keys.tasks, (list) =>
        list.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...patch } as Task;
          if (patch.status) {
            next.completed_at = patch.status === "done" ? (t.completed_at ?? new Date().toISOString()) : null;
          }
          return next;
        }),
      );
      return { rollback };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't save the task: ${errMessage(e)}` });
    },
    onSuccess: (row) => {
      qc.setQueryData<Task[]>(keys.tasks, (list) => list?.map((t) => (t.id === row.id ? row : t)));
    },
  });
}

export function useToggleTask() {
  const update = useUpdateTask();
  return (task: Task) =>
    update.mutate({ id: task.id, patch: { status: task.status === "done" ? "todo" : "done" } });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: TaskInsert) =>
      check(await createClient().from("tasks").insert(input).select().single()),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.tasks });
      const now = new Date().toISOString();
      const temp: Task = {
        id: tempId(),
        user_id: "",
        phase_id: null,
        project_id: null,
        details: null,
        collaborator: null,
        status: "todo",
        due_date: null,
        planned_for: null,
        sort_order: 0,
        completed_at: null,
        created_at: now,
        updated_at: now,
        from_plan: false,
        archived_at: null,
        ...input,
      } as Task;
      const rollback = patchList<Task>(qc, keys.tasks, (list) => [...list, temp]);
      return { rollback, tempId: temp.id };
    },
    onError: (e, _v, ctx) => {
      ctx?.rollback();
      toast({ tone: "error", message: `Couldn't add the task: ${errMessage(e)}` });
    },
    onSuccess: (row, _v, ctx) => {
      qc.setQueryData<Task[]>(keys.tasks, (list) =>
        list?.map((t) => (t.id === ctx?.tempId ? row : t)),
      );
    },
  });
}

/** Delete with a 5-second Undo toast. Plan tasks can only be archived. */
export function useDeleteTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return (task: Task) => {
    if (task.from_plan) {
      toast({ tone: "error", message: "Tasks from the transition plan can be archived, not deleted." });
      return;
    }
    const rollback = patchList<Task>(qc, keys.tasks, (list) => list.filter((t) => t.id !== task.id));
    let undone = false;
    toast({
      message: "Task deleted",
      duration: 5000,
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
      const { error } = await createClient().from("tasks").delete().eq("id", task.id);
      if (error) {
        rollback();
        toast({ tone: "error", message: `Couldn't delete the task: ${error.message}` });
      } else {
        void qc.invalidateQueries({ queryKey: keys.updates });
      }
    }, 5000);
  };
}

/** Persist a new order for a group of tasks (drag or Move up / Move down). */
export function useReorderTasks() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return async (orderedIds: string[]) => {
    const order = new Map(orderedIds.map((id, i) => [id, (i + 1) * 10]));
    const rollback = patchList<Task>(qc, keys.tasks, (list) =>
      list.map((t) => (order.has(t.id) ? { ...t, sort_order: order.get(t.id)! } : t)),
    );
    const sb = createClient();
    const results = await Promise.all(
      [...order].map(([id, sort_order]) => sb.from("tasks").update({ sort_order }).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      rollback();
      toast({ tone: "error", message: `Couldn't reorder: ${failed.error.message}` });
    }
  };
}
