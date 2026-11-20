"use client";

import { NotebookPen, SquarePen } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PageBody } from "@/components/shell/page-layout";
import { useShell } from "@/components/shell/shell-context";
import { UpdateItem } from "@/components/updates/update-item";
import { Button, Card, EmptyState, ErrorState, Field, Input, Select, Skeleton } from "@/components/ui/primitives";
import { useProjects } from "@/lib/queries/projects";
import { useUpdates } from "@/lib/queries/updates";

type Flag = "all" | "risk" | "open_risk" | "waiting" | "report";

export function NotesView() {
  const id = useId();
  const { openLogUpdate } = useShell();
  const q = useUpdates();
  const projects = useProjects().data ?? [];
  const [project, setProject] = useState("all");
  const [flag, setFlag] = useState<Flag>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");

  const rows = useMemo(() => {
    const needle = text.trim().toLowerCase();
    return (q.data ?? []).filter((u) => {
      if (project === "none" ? u.project_id : project !== "all" && u.project_id !== project) return false;
      if (flag === "risk" && !u.is_risk) return false;
      if (flag === "open_risk" && !(u.is_risk && !u.resolved_at)) return false;
      if (flag === "waiting" && !u.waiting_on_client) return false;
      if (flag === "report" && !u.include_in_report) return false;
      if (from && u.happened_on < from) return false;
      if (to && u.happened_on > to) return false;
      if (needle && !u.body.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q.data, project, flag, from, to, text]);

  const filtered = project !== "all" || flag !== "all" || from || to || text;

  return (
    <>
      <PageHeader
        title="Updates & Notes"
        sub="Everything you've logged, newest first"
        actions={
          <Button variant="primary" onClick={() => openLogUpdate()}>
            <SquarePen size={16} aria-hidden /> Log update
          </Button>
        }
      />
      <PageBody>
        <Card>
          <div className="grid gap-3 border-b border-line p-5 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="Project" htmlFor={`${id}-p`}>
              <Select id={`${id}-p`} value={project} onChange={(e) => setProject(e.target.value)}>
                <option value="all">All projects</option>
                <option value="none">No project (general)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Flag" htmlFor={`${id}-f`}>
              <Select id={`${id}-f`} value={flag} onChange={(e) => setFlag(e.target.value as Flag)}>
                <option value="all">Any</option>
                <option value="open_risk">Open risks</option>
                <option value="risk">All risks</option>
                <option value="waiting">Waiting on client</option>
                <option value="report">In weekly report</option>
              </Select>
            </Field>
            <Field label="From" htmlFor={`${id}-from`}>
              <Input id={`${id}-from`} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To" htmlFor={`${id}-to`}>
              <Input id={`${id}-to`} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="Text" htmlFor={`${id}-q`}>
              <Input id={`${id}-q`} type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search notes" />
            </Field>
          </div>
          <p className="sr-only" aria-live="polite">
            {rows.length} updates
          </p>
          {q.isLoading ? (
            <Skeleton className="m-5 h-40" />
          ) : q.error ? (
            <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<NotebookPen />}
              title={filtered ? "No updates match these filters" : "No updates yet"}
              body={filtered ? "Try widening the date range or clearing a filter." : "Log progress, decisions and blockers as you go. They feed your weekly report."}
              action={
                filtered ? (
                  <Button
                    onClick={() => {
                      setProject("all");
                      setFlag("all");
                      setFrom("");
                      setTo("");
                      setText("");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => openLogUpdate()}>
                    Log update
                  </Button>
                )
              }
            />
          ) : (
            <ul className="px-5">
              {rows.map((u) => (
                <UpdateItem key={u.id} update={u} />
              ))}
            </ul>
          )}
        </Card>
      </PageBody>
    </>
  );
}
