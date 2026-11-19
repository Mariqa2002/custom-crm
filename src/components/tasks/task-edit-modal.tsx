"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useActiveProjects } from "@/lib/queries/projects";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { Task } from "@/lib/types";
import { Modal } from "../ui/modal";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";

const schema = z.object({
  title: z.string().trim().min(1, "A task needs a title").max(300),
  details: z.string().max(5000),
  due_date: z.string(),
  planned_for: z.string(),
  project_id: z.string(),
  collaborator: z.string().max(200),
});
type Values = z.infer<typeof schema>;

export type TaskField = "title" | "due_date" | "planned_for" | "project_id";

export function TaskEditModal({
  task,
  focus = "title",
  onClose,
}: {
  task: Task | null;
  focus?: TaskField;
  onClose: () => void;
}) {
  const id = useId();
  const update = useUpdateTask();
  const projects = useActiveProjects().data ?? [];
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      title: task?.title ?? "",
      details: task?.details ?? "",
      due_date: task?.due_date ?? "",
      planned_for: task?.planned_for ?? "",
      project_id: task?.project_id ?? "",
      collaborator: task?.collaborator ?? "",
    },
  });

  useEffect(() => {
    if (task) {
      const t = window.setTimeout(() => form.setFocus(focus), 30);
      return () => window.clearTimeout(t);
    }
  }, [task, focus, form]);

  const onSubmit = (v: Values) => {
    if (!task) return;
    update.mutate({
      id: task.id,
      patch: {
        title: v.title.trim(),
        details: v.details.trim() || null,
        due_date: v.due_date || null,
        planned_for: v.planned_for || null,
        project_id: v.project_id || null,
        collaborator: v.collaborator.trim() || null,
      },
    });
    onClose();
  };

  return (
    <Modal
      open={!!task}
      onClose={onClose}
      title="Edit task"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={`${id}-f`}>
            Save
          </Button>
        </>
      }
    >
      <form id={`${id}-f`} onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor={`${id}-title`} error={form.formState.errors.title?.message} className="sm:col-span-2">
          <Input id={`${id}-title`} {...form.register("title")} />
        </Field>
        <Field label="Details" htmlFor={`${id}-details`} className="sm:col-span-2">
          <Textarea id={`${id}-details`} {...form.register("details")} />
        </Field>
        <Field label="Due date" htmlFor={`${id}-due`}>
          <Input id={`${id}-due`} type="date" {...form.register("due_date")} />
        </Field>
        <Field label="Plan for a day" htmlFor={`${id}-plan`} hint="Puts the task on Today for that date">
          <Input id={`${id}-plan`} type="date" {...form.register("planned_for")} />
        </Field>
        <Field label="Project" htmlFor={`${id}-project`}>
          <Select id={`${id}-project`} {...form.register("project_id")}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Working with" htmlFor={`${id}-collab`}>
          <Input id={`${id}-collab`} placeholder="e.g. Systems Analyst" {...form.register("collaborator")} />
        </Field>
      </form>
    </Modal>
  );
}
