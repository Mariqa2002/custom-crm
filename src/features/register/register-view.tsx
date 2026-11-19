"use client";

import { ArrowDownUp, Plus, Table2 } from "lucide-react";
import { useMemo, useState } from "react";
import { RegisterTable } from "@/components/projects/register-table";
import { PageHeader } from "@/components/shell/page-header";
import { PageBody } from "@/components/shell/page-layout";
import { useShell } from "@/components/shell/shell-context";
import { Button, Card, Checkbox, EmptyState, ErrorState, Select, Skeleton } from "@/components/ui/primitives";
import { PROJECT_STATUSES } from "@/lib/constants";
import { useProjects } from "@/lib/queries/projects";
import type { ProjectStatus } from "@/lib/types";

export function RegisterView() {
  const { openAddProject } = useShell();
  const q = useProjects();
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [sort, setSort] = useState<"none" | "asc" | "desc">("none");
  const [showArchived, setShowArchived] = useState(false);

  const rows = useMemo(() => {
    let list = (q.data ?? []).filter((p) => showArchived || !p.archived_at);
    if (status !== "all") list = list.filter((p) => p.status === status);
    if (sort !== "none") {
      list = [...list].sort((a, b) => {
        const av = a.target_date ?? (sort === "asc" ? "9999" : "0000");
        const bv = b.target_date ?? (sort === "asc" ? "9999" : "0000");
        return sort === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [q.data, status, sort, showArchived]);

  return (
    <>
      <PageHeader
        title="Assignment Register"
        sub="Website Development Assignment Register (§5 of the transition plan)"
        actions={
          <Button variant="primary" onClick={openAddProject}>
            <Plus size={16} aria-hidden /> Add project
          </Button>
        }
      />
      <PageBody>
        <Card>
          <div className="flex flex-wrap items-center gap-3 px-5 py-4">
            <label htmlFor="status-filter" className="text-sm font-semibold">
              Status
            </label>
            <Select
              id="status-filter"
              className="max-w-64"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus | "all")}
            >
              <option value="all">All statuses</option>
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              aria-pressed={sort !== "none"}
              onClick={() => setSort(sort === "none" ? "asc" : sort === "asc" ? "desc" : "none")}
            >
              <ArrowDownUp size={16} aria-hidden />
              {sort === "none" ? "Sort by target date" : sort === "asc" ? "Target date: soonest first" : "Target date: latest first"}
            </Button>
            <Checkbox label="Show archived" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            <span className="ml-auto text-sm text-muted" aria-live="polite">
              {rows.length} {rows.length === 1 ? "project" : "projects"}
            </span>
          </div>
          {q.isLoading ? (
            <Skeleton className="m-5 h-40" />
          ) : q.error ? (
            <ErrorState message={q.error.message} onRetry={() => void q.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Table2 />}
              title={status === "all" ? "No projects in the register yet" : "No projects with this status"}
              body="Add each website under development, maintenance or review."
              action={
                <Button variant="primary" onClick={openAddProject}>
                  <Plus size={16} aria-hidden /> Add project
                </Button>
              }
            />
          ) : (
            <RegisterTable projects={rows} editable />
          )}
        </Card>
        <p className="text-xs text-muted">
          Click a cell to edit it. Enter saves, Esc cancels. Status and target date save as soon as you change them.
        </p>
      </PageBody>
    </>
  );
}
