"use client";

import { ArrowLeft, ListTodo, NotebookPen, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { ProjectFormModal } from "@/components/projects/project-form";
import { RegisterTable, StatusPill } from "@/components/projects/register-table";
import { PageHeader } from "@/components/shell/page-header";
import { PageBody } from "@/components/shell/page-layout";
import { OpenTaskProvider, TaskList } from "@/components/tasks/task-list";
import { UpdateComposer } from "@/components/updates/composer";
import { UpdateItem } from "@/components/updates/update-item";
import { Button, Card, CardHeader, EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { useProjects } from "@/lib/queries/projects";
import { useCreateTask, useTasks } from "@/lib/queries/tasks";
import { useUpdates } from "@/lib/queries/updates";

export function ProjectView({ id }: { id: string }) {
  const projectsQ = useProjects();
  const project = projectsQ.data?.find((p) => p.id === id);
  const tasks = (useTasks().data ?? []).filter((t) => t.project_id === id && !t.archived_at);
  const updates = (useUpdates().data ?? []).filter((u) => u.project_id === id);
  const [editing, setEditing] = useState(false);

  if (projectsQ.isLoading) return <Skeleton className="m-8 h-64" />;
  if (!project) {
    return (
      <PageBody>
        <Card className="mt-8">
          <EmptyState
            title="Project not found"
            body="It may have been removed."
            action={
              <Link href="/register" className="font-semibold text-accent-text underline">
                Back to the register
              </Link>
            }
          />
        </Card>
      </PageBody>
    );
  }

  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <OpenTaskProvider>
      <div className="px-4 pt-5 md:px-8 xl:px-9">
        <Link href="/register" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
          <ArrowLeft size={16} aria-hidden /> Assignment Register
        </Link>
      </div>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            <span aria-hidden className="size-4 rounded" style={{ background: project.color }} />
            {project.name}
          </span>
        }
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            {project.client || "Ministry / department to fill"} · <StatusPill status={project.status} />
            {project.archived_at && <span>(archived)</span>}
          </span>
        }
        search={false}
        actions={
          <Button onClick={() => setEditing(true)}>
            <Pencil size={16} aria-hidden /> Edit project
          </Button>
        }
      />
      <PageBody>
        <Card aria-label="Register row">
          <RegisterTable projects={[project]} editable caption={`Register row for ${project.name}`} />
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card aria-labelledby="ptasks">
            <CardHeader id="ptasks" icon={<ListTodo size={18} />} title="Tasks" sub={`${open.length} open · ${done.length} done`} />
            <div className="px-3 md:px-4">
              {tasks.length > 0 && <TaskList tasks={[...open, ...done]} showProject={false} reorderable={false} label="Project tasks" />}
              <AddProjectTask projectId={project.id} />
            </div>
          </Card>

          <Card aria-labelledby="pupdates">
            <CardHeader id="pupdates" icon={<NotebookPen size={18} />} title="Updates" sub="Newest first" />
            <div className="px-5 pb-2">
              <UpdateComposer projectId={project.id} autoFocus={false} compact />
            </div>
            {updates.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">No updates for this project yet.</p>
            ) : (
              <ul className="px-5">
                {updates.map((u) => (
                  <UpdateItem key={u.id} update={u} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </PageBody>
      <ProjectFormModal open={editing} onClose={() => setEditing(false)} project={project} />
    </OpenTaskProvider>
  );
}

function AddProjectTask({ projectId }: { projectId: string }) {
  const id = useId();
  const create = useCreateTask();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  return (
    <form
      className="flex flex-col gap-2 py-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        create.mutate({ title: t.slice(0, 300), project_id: projectId, due_date: due || null });
        setTitle("");
        setDue("");
      }}
    >
      <label htmlFor={`${id}-t`} className="sr-only">New task</label>
      <Input id={`${id}-t`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" />
      <label htmlFor={`${id}-d`} className="sr-only">Due date</label>
      <Input id={`${id}-d`} type="date" value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-40" />
      <Button type="submit" className="shrink-0">
        <Plus size={16} aria-hidden /> Add
      </Button>
    </form>
  );
}
