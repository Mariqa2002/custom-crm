"use client";

import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CalendarPlus,
  FolderInput,
  GripVertical,
  Pencil,
  ShieldAlert,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ACCESS_HINT, isAccessTask } from "@/lib/constants";
import { fmt, todayISO } from "@/lib/dates";
import { useProjects } from "@/lib/queries/projects";
import { useDeleteTask, useToggleTask, useUpdateTask } from "@/lib/queries/tasks";
import { isTemp } from "@/lib/queries/shared";
import type { Task } from "@/lib/types";
import { UpdateComposer } from "../updates/composer";
import { Menu, type MenuItem } from "../ui/menu";
import { cn } from "../ui/primitives";
import { TaskEditModal, type TaskField } from "./task-edit-modal";

export function TaskItem({
  task,
  open,
  onToggleOpen,
  onMoveUp,
  onMoveDown,
  drag,
  showProject = true,
  overdue,
}: {
  task: Task;
  open: boolean;
  onToggleOpen: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  drag?: {
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    isOver: boolean;
  };
  showProject?: boolean;
  overdue?: boolean;
}) {
  const toggle = useToggleTask();
  const update = useUpdateTask();
  const del = useDeleteTask();
  const project = useProjects().data?.find((p) => p.id === task.project_id);
  const [edit, setEdit] = useState<TaskField | null>(null);
  const done = task.status === "done";
  const today = todayISO();
  const pending = isTemp(task.id);
  const composerId = `composer-${task.id}`;
  const access = isAccessTask(task.title);

  const items: MenuItem[] = [
    { label: "Edit title and details", icon: <Pencil size={16} />, onSelect: () => setEdit("title") },
    { label: "Set due date", icon: <CalendarClock size={16} />, onSelect: () => setEdit("due_date") },
    task.planned_for === today
      ? {
          label: "Remove from today",
          icon: <CalendarPlus size={16} />,
          onSelect: () => update.mutate({ id: task.id, patch: { planned_for: null } }),
        }
      : {
          label: "Plan for today",
          icon: <CalendarPlus size={16} />,
          onSelect: () => update.mutate({ id: task.id, patch: { planned_for: today } }),
        },
    { label: "Plan for a day…", icon: <CalendarPlus size={16} />, onSelect: () => setEdit("planned_for") },
    { label: "Move to a project", icon: <FolderInput size={16} />, onSelect: () => setEdit("project_id") },
  ];
  if (onMoveUp || onMoveDown) {
    items.push("separator");
    items.push({ label: "Move up", icon: <ArrowUp size={16} />, onSelect: () => onMoveUp?.(), disabled: !onMoveUp });
    items.push({ label: "Move down", icon: <ArrowDown size={16} />, onSelect: () => onMoveDown?.(), disabled: !onMoveDown });
  }
  items.push("separator");
  if (task.from_plan) {
    items.push(
      task.archived_at
        ? {
            label: "Restore",
            icon: <ArchiveRestore size={16} />,
            onSelect: () => update.mutate({ id: task.id, patch: { archived_at: null } }),
          }
        : {
            label: "Archive",
            icon: <Archive size={16} />,
            onSelect: () => update.mutate({ id: task.id, patch: { archived_at: new Date().toISOString() } }),
          },
    );
  } else {
    items.push({ label: "Delete", icon: <Trash2 size={16} />, danger: true, onSelect: () => del(task) });
  }

  return (
    <li
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
      className={cn(
        "group border-b border-line last:border-b-0",
        open && "relative z-10 -mx-2 rounded-2xl border border-border bg-surface px-2 shadow-card",
        drag?.isOver && "border-t-2 border-t-accent",
        pending && "opacity-60",
      )}
    >
      <div className="flex items-start gap-1 py-1">
        {drag && (
          <span
            draggable
            onDragStart={drag.onDragStart}
            onDragEnd={drag.onDragEnd}
            aria-hidden
            title="Drag to reorder"
            className="hidden h-11 w-5 shrink-0 cursor-grab items-center justify-center text-muted opacity-0 group-hover:opacity-100 md:flex"
          >
            <GripVertical size={16} />
          </span>
        )}
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
          <input
            type="checkbox"
            checked={done}
            disabled={pending}
            onChange={() => toggle(task)}
            className="size-5 rounded"
            aria-label={`Mark "${task.title}" ${done ? "not done" : "done"}`}
          />
        </label>
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={open}
          aria-controls={composerId}
          className="min-h-11 min-w-0 flex-1 py-2.5 text-left"
        >
          <span
            className={cn(
              "block text-sm leading-snug font-medium",
              done && "text-muted line-through",
              overdue && !done && "text-orange-text",
            )}
          >
            {task.title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {task.due_date && (
              <span className={cn("inline-flex items-center gap-1", (overdue || task.due_date <= today) && !done && "font-semibold text-orange-text")}>
                <CalendarClock size={12} aria-hidden />
                {overdue && !done ? "Overdue · " : "Due "}
                {fmt(task.due_date, "EEE, MMM d")}
              </span>
            )}
            {task.collaborator && (
              <span className="inline-flex items-center gap-1">
                <Users size={12} aria-hidden /> With {task.collaborator}
              </span>
            )}
            {showProject && project && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 rounded-sm" style={{ background: project.color }} />
                {project.name}
              </span>
            )}
            {task.planned_for && task.planned_for !== task.due_date && (
              <span>Planned {task.planned_for === today ? "today" : fmt(task.planned_for, "EEE, MMM d")}</span>
            )}
            {access && (
              <span className="inline-flex items-center gap-1" title={ACCESS_HINT}>
                <ShieldAlert size={12} aria-hidden /> Access
              </span>
            )}
          </span>
        </button>
        {!pending && <Menu label={`Task actions: ${task.title}`} items={items} />}
      </div>
      {open && (
        <div id={composerId} className="pb-4 pl-12">
          {task.details && <p className="mb-3 text-sm whitespace-pre-wrap text-muted">{task.details}</p>}
          {project && (
            <p className="mb-2 text-xs text-muted">
              Logged against{" "}
              <Link className="font-semibold text-accent-text underline" href={`/projects/${project.id}`}>
                {project.name}
              </Link>
            </p>
          )}
          <UpdateComposer
            taskId={task.id}
            projectId={task.project_id}
            hint={access ? ACCESS_HINT : undefined}
            onDone={onToggleOpen}
            onCancel={onToggleOpen}
            compact
          />
        </div>
      )}
      <TaskEditModal task={edit ? task : null} focus={edit ?? "title"} onClose={() => setEdit(null)} />
    </li>
  );
}
