"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useReorderTasks } from "@/lib/queries/tasks";
import type { Task } from "@/lib/types";
import { TaskItem } from "./task-item";

/** Only one task's composer is open at a time, across all lists on a page. */
const OpenCtx = createContext<{ openId: string | null; setOpenId: (id: string | null) => void } | null>(
  null,
);

export function OpenTaskProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return <OpenCtx.Provider value={{ openId, setOpenId }}>{children}</OpenCtx.Provider>;
}

function useOpenTask() {
  const ctx = useContext(OpenCtx);
  const [localId, setLocalId] = useState<string | null>(null);
  return ctx ?? { openId: localId, setOpenId: setLocalId };
}

export function TaskList({
  tasks,
  reorderable = true,
  showProject = true,
  overdue,
  label,
}: {
  tasks: Task[];
  reorderable?: boolean;
  showProject?: boolean;
  overdue?: boolean;
  label?: string;
}) {
  const { openId, setOpenId } = useOpenTask();
  const reorder = useReorderTasks();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const move = (from: number, to: number) => {
    const ids = tasks.map((t) => t.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    void reorder(ids);
  };

  return (
    <ul aria-label={label} className="flex flex-col">
      {tasks.map((t, i) => (
        <TaskItem
          key={t.id}
          task={t}
          overdue={overdue}
          showProject={showProject}
          open={openId === t.id}
          onToggleOpen={() => setOpenId(openId === t.id ? null : t.id)}
          onMoveUp={reorderable && i > 0 ? () => move(i, i - 1) : undefined}
          onMoveDown={reorderable && i < tasks.length - 1 ? () => move(i, i + 1) : undefined}
          drag={
            reorderable
              ? {
                  isOver: overId === t.id && dragId !== t.id,
                  onDragStart: (e) => {
                    setDragId(t.id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", t.id);
                  },
                  onDragOver: (e) => {
                    if (!dragId || !tasks.some((x) => x.id === dragId)) return;
                    e.preventDefault();
                    setOverId(t.id);
                  },
                  onDrop: (e) => {
                    e.preventDefault();
                    const from = tasks.findIndex((x) => x.id === dragId);
                    if (from >= 0 && from !== i) move(from, i);
                    setDragId(null);
                    setOverId(null);
                  },
                  onDragEnd: () => {
                    setDragId(null);
                    setOverId(null);
                  },
                }
              : undefined
          }
        />
      ))}
    </ul>
  );
}
