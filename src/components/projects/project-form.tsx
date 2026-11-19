"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { PROJECT_COLORS, PROJECT_STATUSES } from "@/lib/constants";
import { useCreateProject, useUpdateProject } from "@/lib/queries/projects";
import type { Project, ProjectStatus } from "@/lib/types";
import { Modal } from "../ui/modal";
import { Button, Field, Input, Select, Textarea } from "../ui/primitives";

const schema = z.object({
  name: z.string().trim().min(1, "Give the project a name").max(200),
  client: z.string().trim().max(200),
  status: z.enum(["not_started", "in_progress", "under_review", "pending_client_feedback", "completed"]),
  outstanding_tasks: z.string().trim().max(2000),
  target_date: z.string(),
  remarks: z.string().trim().max(2000),
  priority: z.string(),
  color: z.string(),
});

type Values = z.infer<typeof schema>;

const blank = (s: string) => (s.trim() === "" ? null : s.trim());

export function ProjectFormModal({
  open,
  onClose,
  project,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  onCreated?: (name: string) => void;
}) {
  const id = useId();
  const create = useCreateProject();
  const update = useUpdateProject();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: project?.name ?? "",
      client: project?.client ?? "",
      status: (project?.status ?? "not_started") as ProjectStatus,
      outstanding_tasks: project?.outstanding_tasks ?? "",
      target_date: project?.target_date ?? "",
      remarks: project?.remarks ?? "",
      priority: project?.priority ? String(project.priority) : "",
      color: project?.color ?? PROJECT_COLORS[0].value,
    },
  });
  const color = useWatch({ control: form.control, name: "color" });
  const err = form.formState.errors;

  const onSubmit = (v: Values) => {
    const payload = {
      name: v.name.trim(),
      client: blank(v.client),
      status: v.status,
      outstanding_tasks: blank(v.outstanding_tasks),
      target_date: blank(v.target_date),
      remarks: blank(v.remarks),
      priority: v.priority ? Number(v.priority) : null,
      color: v.color,
    };
    if (project) update.mutate({ id: project.id, patch: payload });
    else {
      create.mutate(payload);
      onCreated?.(payload.name);
    }
    form.reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "Add project"}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={`${id}-form`}>
            {project ? "Save changes" : "Add project"}
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Website / Project" htmlFor={`${id}-name`} error={err.name?.message} className="sm:col-span-2">
          <Input id={`${id}-name`} autoFocus {...form.register("name")} />
        </Field>
        <Field label="Ministry / Department" htmlFor={`${id}-client`}>
          <Input id={`${id}-client`} placeholder="e.g. Ministry of Tourism" {...form.register("client")} />
        </Field>
        <Field label="Status" htmlFor={`${id}-status`}>
          <Select id={`${id}-status`} {...form.register("status")}>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Outstanding tasks" htmlFor={`${id}-out`} className="sm:col-span-2">
          <Textarea id={`${id}-out`} className="min-h-20" {...form.register("outstanding_tasks")} />
        </Field>
        <Field label="Target completion date" htmlFor={`${id}-target`}>
          <Input id={`${id}-target`} type="date" {...form.register("target_date")} />
        </Field>
        <Field label="Priority (set by the Coordinator)" htmlFor={`${id}-prio`} hint="1 = highest">
          <Select id={`${id}-prio`} {...form.register("priority")}>
            <option value="">Not set</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Remarks (issues, risks)" htmlFor={`${id}-remarks`} className="sm:col-span-2">
          <Textarea id={`${id}-remarks`} className="min-h-20" {...form.register("remarks")} />
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-[13px] font-semibold">Colour</legend>
          <div className="flex flex-wrap gap-1">
            {PROJECT_COLORS.map((c) => (
              <label key={c.value} className="grid size-11 cursor-pointer place-items-center rounded-xl hover:bg-surface-2">
                <input
                  type="radio"
                  value={c.value}
                  className="peer sr-only"
                  aria-label={c.name}
                  {...form.register("color")}
                />
                <span
                  className="grid size-7 place-items-center rounded-lg text-white ring-offset-2 ring-offset-surface peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                  style={{ background: c.value }}
                >
                  {color === c.value && <Check size={16} aria-hidden />}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
