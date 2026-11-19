"use client";

import { AlertTriangle, CheckCircle2, Clock, FileText, Pencil, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fmt } from "@/lib/dates";
import { useProjects } from "@/lib/queries/projects";
import { isTemp } from "@/lib/queries/shared";
import { useTasks } from "@/lib/queries/tasks";
import { useDeleteUpdate, useEditUpdate } from "@/lib/queries/updates";
import type { Update } from "@/lib/types";
import { Menu, type MenuItem } from "../ui/menu";
import { Button, Pill, Textarea, cn } from "../ui/primitives";

export function UpdateItem({ update: u, compact }: { update: Update; compact?: boolean }) {
  const edit = useEditUpdate();
  const del = useDeleteUpdate();
  const project = useProjects().data?.find((p) => p.id === u.project_id);
  const task = useTasks().data?.find((t) => t.id === u.task_id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(u.body);
  const openRisk = u.is_risk && !u.resolved_at;
  const pending = isTemp(u.id);

  const items: MenuItem[] = [
    { label: "Edit text", icon: <Pencil size={16} />, onSelect: () => { setDraft(u.body); setEditing(true); } },
    {
      label: u.include_in_report ? "Leave out of weekly report" : "Include in weekly report",
      icon: <FileText size={16} />,
      onSelect: () => edit.mutate({ id: u.id, patch: { include_in_report: !u.include_in_report } }),
    },
    {
      label: u.is_risk ? "Remove risk flag" : "Flag as risk",
      icon: <AlertTriangle size={16} />,
      onSelect: () => edit.mutate({ id: u.id, patch: { is_risk: !u.is_risk, resolved_at: null } }),
    },
    {
      label: u.waiting_on_client ? "No longer waiting on client" : "Waiting on client",
      icon: <Clock size={16} />,
      onSelect: () => edit.mutate({ id: u.id, patch: { waiting_on_client: !u.waiting_on_client } }),
    },
  ];
  if (u.is_risk) {
    items.push(
      u.resolved_at
        ? { label: "Reopen risk", icon: <Undo2 size={16} />, onSelect: () => edit.mutate({ id: u.id, patch: { resolved_at: null } }) }
        : { label: "Mark resolved", icon: <CheckCircle2 size={16} />, onSelect: () => edit.mutate({ id: u.id, patch: { resolved_at: new Date().toISOString() } }) },
    );
  }
  items.push("separator", { label: "Delete", icon: <Trash2 size={16} />, danger: true, onSelect: () => del(u) });

  return (
    <li className={cn("flex gap-3 border-b border-line py-3 last:border-b-0", pending && "opacity-60")}>
      <span
        aria-hidden
        className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", openRisk ? "bg-orange-text" : "bg-border")}
      />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          <span className="font-semibold text-text">{fmt(u.happened_on, "EEE, MMM d")}</span>
          {project && (
            <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1.5 hover:underline">
              <span className="size-2.5 rounded-sm" style={{ background: project.color }} />
              {project.name}
            </Link>
          )}
          {task && <span className="truncate">· {task.title}</span>}
          {!project && !task && <span>General note</span>}
        </p>
        {editing ? (
          <form
            className="mt-2 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const body = draft.trim();
              if (!body) return;
              edit.mutate({ id: u.id, patch: { body: body.slice(0, 5000) } });
              setEditing(false);
            }}
          >
            <label htmlFor={`edit-${u.id}`} className="sr-only">Edit update</label>
            <Textarea id={`edit-${u.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button variant="primary" size="sm" type="submit">Save</Button>
            </div>
          </form>
        ) : (
          <p className={cn("mt-1 text-sm whitespace-pre-wrap", compact && "line-clamp-3")}>{u.body}</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {openRisk && (
            <Pill className="bg-orange-soft text-orange-text">
              <AlertTriangle size={12} aria-hidden /> Risk
            </Pill>
          )}
          {u.is_risk && u.resolved_at && (
            <Pill className="bg-green-soft text-green-text">
              <CheckCircle2 size={12} aria-hidden /> Risk resolved
            </Pill>
          )}
          {u.waiting_on_client && (
            <Pill className="bg-purple-soft text-purple-text">
              <Clock size={12} aria-hidden /> Waiting on client
            </Pill>
          )}
          {u.include_in_report && !compact && (
            <Pill className="bg-accent-soft text-accent-text">
              <FileText size={12} aria-hidden /> In report
            </Pill>
          )}
        </div>
      </div>
      {!pending && <Menu label="Update actions" items={items} />}
    </li>
  );
}
