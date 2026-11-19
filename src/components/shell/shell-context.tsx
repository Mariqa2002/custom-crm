"use client";

import { createContext, useCallback, useContext, useId, useMemo, useState, type ReactNode } from "react";
import { SettingsPanel } from "@/features/settings/settings-view";
import { ACCESS_HINT, isAccessTask } from "@/lib/constants";
import { useActiveProjects } from "@/lib/queries/projects";
import { useTasks } from "@/lib/queries/tasks";
import { ProjectFormModal } from "../projects/project-form";
import { UpdateComposer } from "../updates/composer";
import { Modal } from "../ui/modal";
import { Field, Select } from "../ui/primitives";

type LogTarget = { taskId?: string | null; projectId?: string | null };

type ShellCtx = {
  openLogUpdate: (target?: LogTarget) => void;
  openAddProject: () => void;
  openSettings: () => void;
};

const Ctx = createContext<ShellCtx | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [logOpen, setLogOpen] = useState(false);
  const [target, setTarget] = useState<string>("none");
  const [projectOpen, setProjectOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openLogUpdate = useCallback((t?: LogTarget) => {
    setTarget(t?.taskId ? `task:${t.taskId}` : t?.projectId ? `project:${t.projectId}` : "none");
    setLogOpen(true);
  }, []);
  const openAddProject = useCallback(() => setProjectOpen(true), []);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const value = useMemo(
    () => ({ openLogUpdate, openAddProject, openSettings }),
    [openLogUpdate, openAddProject, openSettings],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <LogUpdateModal open={logOpen} onClose={() => setLogOpen(false)} target={target} setTarget={setTarget} />
      <ProjectFormModal open={projectOpen} onClose={() => setProjectOpen(false)} />
      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings" wide>
        <SettingsPanel onSignedOut={() => setSettingsOpen(false)} />
      </Modal>
    </Ctx.Provider>
  );
}

export function useShell() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShell must be used inside ShellProvider");
  return ctx;
}

function LogUpdateModal({
  open,
  onClose,
  target,
  setTarget,
}: {
  open: boolean;
  onClose: () => void;
  target: string;
  setTarget: (v: string) => void;
}) {
  const id = useId();
  const projects = useActiveProjects().data ?? [];
  const tasks = (useTasks().data ?? []).filter((t) => !t.archived_at);
  const [kind, ref] = target.split(":");
  const task = kind === "task" ? tasks.find((t) => t.id === ref) : undefined;
  const projectId = kind === "project" ? ref : (task?.project_id ?? null);
  const openTasks = tasks.filter((t) => t.status !== "done" || t.id === ref);

  return (
    <Modal open={open} onClose={onClose} title="Log update" wide>
      <div className="flex flex-col gap-4">
        <Field label="About" htmlFor={`${id}-about`}>
          <Select id={`${id}-about`} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="none">General note (no project or task)</option>
            {projects.length > 0 && (
              <optgroup label="Projects">
                {projects.map((p) => (
                  <option key={p.id} value={`project:${p.id}`}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            {openTasks.length > 0 && (
              <optgroup label="Tasks">
                {openTasks.map((t) => (
                  <option key={t.id} value={`task:${t.id}`}>
                    {t.title.length > 80 ? `${t.title.slice(0, 80)}…` : t.title}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
        </Field>
        <UpdateComposer
          key={target}
          taskId={task?.id ?? null}
          projectId={projectId}
          showDate
          hint={task && isAccessTask(task.title) ? ACCESS_HINT : undefined}
          onDone={onClose}
          onCancel={onClose}
        />
      </div>
    </Modal>
  );
}
