"use client";

import { Archive, ArchiveRestore, ExternalLink, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PROJECT_STATUSES, STATUS_LABEL, STATUS_PILL } from "@/lib/constants";
import { fmt } from "@/lib/dates";
import { useUpdateProject } from "@/lib/queries/projects";
import { isTemp } from "@/lib/queries/shared";
import type { Project, ProjectPatch, ProjectStatus } from "@/lib/types";
import { Menu } from "../ui/menu";
import { Pill, cn } from "../ui/primitives";
import { ProjectFormModal } from "./project-form";

export function StatusPill({ status }: { status: ProjectStatus }) {
  return <Pill className={STATUS_PILL[status]}>{STATUS_LABEL[status]}</Pill>;
}

const th = "px-4 py-3 text-left text-xs font-bold tracking-wide text-muted uppercase whitespace-nowrap";
const td = "px-4 py-3 align-top text-sm";

/** The Website Development Assignment Register (six §5 fields + optional Priority). */
export function RegisterTable({
  projects,
  editable = false,
  showPriority,
  caption = "Website Development Assignment Register",
}: {
  projects: Project[];
  editable?: boolean;
  showPriority?: boolean;
  caption?: string;
}) {
  const withPriority = showPriority ?? projects.some((p) => p.priority);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-y border-line bg-surface-2">
          <tr>
            <th scope="col" className={th}>Website / Project</th>
            <th scope="col" className={th}>Ministry / Department</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}>Outstanding tasks</th>
            <th scope="col" className={th}>Target date</th>
            <th scope="col" className={th}>Remarks</th>
            {withPriority && <th scope="col" className={th}>Priority</th>}
            {editable && (
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {projects.map((p) =>
            editable ? (
              <EditableRow key={p.id} project={p} withPriority={withPriority} />
            ) : (
              <tr key={p.id} className={cn("border-b border-line last:border-b-0", p.archived_at && "opacity-60")}>
                <th scope="row" className={cn(td, "text-left font-semibold")}>
                  <Link href={`/projects/${p.id}`} className="inline-flex items-center gap-2 hover:underline">
                    <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
                    {p.name}
                  </Link>
                </th>
                <td className={td}>{p.client || <span className="text-muted">To fill</span>}</td>
                <td className={td}>
                  <StatusPill status={p.status} />
                </td>
                <td className={cn(td, "max-w-64")}>{p.outstanding_tasks || <span className="text-muted">—</span>}</td>
                <td className={cn(td, "whitespace-nowrap")}>
                  {p.target_date ? fmt(p.target_date, "MMM d, yyyy") : <span className="text-muted">Not set</span>}
                </td>
                <td className={cn(td, "max-w-64")}>{p.remarks || <span className="text-muted">—</span>}</td>
                {withPriority && <td className={td}>{p.priority ?? <span className="text-muted">—</span>}</td>}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function EditableRow({ project: p, withPriority }: { project: Project; withPriority: boolean }) {
  const update = useUpdateProject();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const save = (patch: ProjectPatch) => update.mutate({ id: p.id, patch });
  const disabled = isTemp(p.id);

  return (
    <tr className={cn("border-b border-line last:border-b-0", p.archived_at && "opacity-60")}>
      <th scope="row" className={cn(td, "text-left font-semibold")}>
        <Link href={`/projects/${p.id}`} className="inline-flex items-center gap-2 hover:underline">
          <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
          {p.name}
        </Link>
        {p.archived_at && <span className="ml-2 text-xs font-normal text-muted">(archived)</span>}
      </th>
      <td className={td}>
        <InlineText label={`Ministry / Department for ${p.name}`} value={p.client} placeholder="To fill" onSave={(v) => save({ client: v })} disabled={disabled} />
      </td>
      <td className={td}>
        <label className="sr-only" htmlFor={`status-${p.id}`}>
          Status for {p.name}
        </label>
        <select
          id={`status-${p.id}`}
          value={p.status}
          disabled={disabled}
          onChange={(e) => save({ status: e.target.value as ProjectStatus })}
          className={cn(
            "h-11 cursor-pointer rounded-full border-0 px-3 text-xs font-semibold focus:outline-none md:h-8",
            STATUS_PILL[p.status],
          )}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </td>
      <td className={cn(td, "max-w-64")}>
        <InlineText label={`Outstanding tasks for ${p.name}`} value={p.outstanding_tasks} multiline onSave={(v) => save({ outstanding_tasks: v })} disabled={disabled} />
      </td>
      <td className={td}>
        <label className="sr-only" htmlFor={`target-${p.id}`}>
          Target date for {p.name}
        </label>
        <input
          id={`target-${p.id}`}
          type="date"
          value={p.target_date ?? ""}
          disabled={disabled}
          onChange={(e) => save({ target_date: e.target.value || null })}
          className="h-11 rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-border focus:border-accent focus:outline-none md:h-9"
        />
      </td>
      <td className={cn(td, "max-w-64")}>
        <InlineText label={`Remarks for ${p.name}`} value={p.remarks} multiline onSave={(v) => save({ remarks: v })} disabled={disabled} />
      </td>
      {withPriority && (
        <td className={td}>
          <label className="sr-only" htmlFor={`prio-${p.id}`}>
            Priority for {p.name}
          </label>
          <select
            id={`prio-${p.id}`}
            value={p.priority ?? ""}
            disabled={disabled}
            onChange={(e) => save({ priority: e.target.value ? Number(e.target.value) : null })}
            className="h-11 rounded-lg border border-transparent bg-transparent px-2 text-sm hover:border-border md:h-9"
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </td>
      )}
      <td className={cn(td, "w-12 py-1.5")}>
        {!disabled && (
          <Menu
            label={`Actions for ${p.name}`}
            items={[
              { label: "Open project", icon: <ExternalLink size={16} />, onSelect: () => router.push(`/projects/${p.id}`) },
              { label: "Edit all fields", icon: <Pencil size={16} />, onSelect: () => setEditing(true) },
              p.archived_at
                ? { label: "Restore", icon: <ArchiveRestore size={16} />, onSelect: () => save({ archived_at: null }) }
                : { label: "Archive", icon: <Archive size={16} />, onSelect: () => save({ archived_at: new Date().toISOString() }) },
            ]}
          />
        )}
        <ProjectFormModal open={editing} onClose={() => setEditing(false)} project={p} />
      </td>
    </tr>
  );
}

/** Click-to-edit text cell. Enter (or blur) saves, Esc cancels. */
export function InlineText({
  label,
  value,
  onSave,
  placeholder = "—",
  multiline,
  disabled,
}: {
  label: string;
  value: string | null;
  onSave: (v: string | null) => void;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim() || null;
    if (next !== (value ?? null)) onSave(next);
  };

  if (!editing) {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={`Edit ${label}`}
        onClick={() => {
          setDraft(value ?? "");
          setEditing(true);
        }}
        className="-mx-2 min-h-11 w-full rounded-lg px-2 py-1 text-left whitespace-pre-wrap hover:bg-surface-2 md:min-h-9"
      >
        {value || <span className="text-muted">{placeholder}</span>}
      </button>
    );
  }

  return (
    <textarea
      ref={ref}
      aria-label={label}
      value={draft}
      rows={multiline ? 3 : 1}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
        } else if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commit();
        }
      }}
      className="-mx-2 w-full min-w-48 resize-y rounded-lg border border-accent bg-surface-2 px-2 py-1 text-sm focus:outline-none"
    />
  );
}
