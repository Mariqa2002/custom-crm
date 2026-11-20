"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlert } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { todayISO } from "@/lib/dates";
import { useCreateUpdate } from "@/lib/queries/updates";
import { looksLikeSecret } from "@/lib/secrets";
import { Button, Checkbox, Input, Textarea } from "../ui/primitives";

const schema = z.object({
  body: z.string().trim().min(1, "Write something first").max(5000, "Keep it under 5,000 characters"),
  include_in_report: z.boolean(),
  is_risk: z.boolean(),
  waiting_on_client: z.boolean(),
  happened_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
});

type Values = z.infer<typeof schema>;

export function UpdateComposer({
  taskId,
  projectId,
  onDone,
  onCancel,
  autoFocus = true,
  showDate = false,
  hint,
  compact,
}: {
  taskId?: string | null;
  projectId?: string | null;
  onDone?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  showDate?: boolean;
  hint?: string;
  compact?: boolean;
}) {
  const id = useId();
  const create = useCreateUpdate();
  const [secretWarning, setSecretWarning] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      body: "",
      include_in_report: true,
      is_risk: false,
      waiting_on_client: false,
      happened_on: todayISO(),
    },
  });

  const submit = (values: Values, override = false) => {
    const why = looksLikeSecret(values.body);
    if (why && !override) {
      setSecretWarning(why);
      return;
    }
    create.mutate({
      body: values.body.trim(),
      include_in_report: values.include_in_report,
      is_risk: values.is_risk,
      waiting_on_client: values.waiting_on_client,
      happened_on: values.happened_on,
      task_id: taskId ?? null,
      project_id: projectId ?? null,
    });
    form.reset({ ...values, body: "", is_risk: false, waiting_on_client: false });
    setSecretWarning(null);
    onDone?.();
  };

  const err = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit((v) => submit(v))}
      className={compact ? "flex flex-col gap-2" : "flex flex-col gap-3"}
      onClick={(e) => e.stopPropagation()}
    >
      <label htmlFor={`${id}-body`} className="sr-only">
        Update
      </label>
      <Textarea
        id={`${id}-body`}
        autoFocus={autoFocus}
        placeholder="What happened? Progress, decisions, blockers…"
        aria-invalid={!!err.body}
        aria-describedby={err.body ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...form.register("body", { onChange: () => setSecretWarning(null) })}
      />
      {hint && (
        <p id={`${id}-hint`} className="flex items-center gap-1.5 text-xs text-muted">
          <ShieldAlert size={14} aria-hidden /> {hint}
        </p>
      )}
      {err.body && (
        <p id={`${id}-err`} role="alert" className="text-xs font-semibold text-orange-text">
          {err.body.message}
        </p>
      )}
      {secretWarning && (
        <div role="alert" className="rounded-xl bg-orange-soft p-3 text-sm text-orange-text">
          <p className="font-semibold">This looks like it contains {secretWarning}.</p>
          <p className="mt-1">
            Credentials must only move through approved secure channels. Record that access was
            verified, not the secret itself.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSecretWarning(null)}>
              Edit text
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => submit(form.getValues(), true)}
            >
              Save anyway
            </Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-4">
        <Checkbox label="Include in weekly report" {...form.register("include_in_report")} />
        <Checkbox label="Flag as risk" {...form.register("is_risk")} />
        <Checkbox label="Waiting on client" {...form.register("waiting_on_client")} />
      </div>
      {showDate && (
        <div className="flex items-center gap-2">
          <label htmlFor={`${id}-date`} className="text-[13px] font-semibold">
            Date
          </label>
          <Input id={`${id}-date`} type="date" className="w-44" {...form.register("happened_on")} />
        </div>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary">
          Save update
        </Button>
      </div>
    </form>
  );
}
