"use client";

import { CheckCircle2, Flag, PartyPopper, Plus, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { RetirePhasesModal } from "@/components/phases/retire-phases-modal";
import { PageHeader } from "@/components/shell/page-header";
import { PageBody } from "@/components/shell/page-layout";
import { useShell } from "@/components/shell/shell-context";
import { PhaseSection } from "@/components/tasks/phase-section";
import { OpenTaskProvider } from "@/components/tasks/task-list";
import { Modal } from "@/components/ui/modal";
import { Button, Card, Checkbox, ErrorState, Input, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { allPhasesComplete, dateOfTimestamp, fmt, getCurrentPhase, isPhaseComplete } from "@/lib/dates";
import { usePhases, useProfile, useUpdatePhase } from "@/lib/queries/misc";
import { useCreateTask, useTasks } from "@/lib/queries/tasks";
import type { Phase } from "@/lib/types";

/** How long a completed phase stays on screen (fade + collapse) before it's archived out of the list. */
const LEAVE_MS = 900;

export function PhasesView() {
  const phasesQ = usePhases();
  const tasksQ = useTasks();
  const profile = useProfile().data;
  const updatePhase = useUpdatePhase();
  const { toast } = useToast();
  const { openSettings } = useShell();
  const [showArchived, setShowArchived] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<{ phase: Phase; open: number } | null>(null);
  const [retireOpen, setRetireOpen] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const phases = [...(phasesQ.data ?? [])].sort((a, b) => a.number - b.number);
  const tasks = tasksQ.data ?? [];
  const current = getCurrentPhase(phases);
  const allDone = allPhasesComplete(phases);
  const retiredOn = dateOfTimestamp(profile?.phases_retired_at);
  const visible = phases.filter((p) => !isPhaseComplete(p) || leaving.has(p.id) || showCompleted);
  const completedCount = phases.filter(isPhaseComplete).length;

  const setSubmitted = (p: Phase, submitted: boolean) =>
    updatePhase.mutate({ id: p.id, patch: { deliverable_submitted_at: submitted ? new Date().toISOString() : null } });

  const stopLeaving = (id: string) =>
    setLeaving((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });

  const complete = (p: Phase) => {
    setConfirming(null);
    setSubmitted(p, true);
    if (!showCompleted) {
      setLeaving((s) => new Set(s).add(p.id));
      timers.current.push(window.setTimeout(() => stopLeaving(p.id), LEAVE_MS));
    }
    toast({
      tone: "success",
      message: `Phase ${p.number} complete and archived.`,
      action: {
        label: "Undo",
        onClick: () => {
          stopLeaving(p.id);
          setSubmitted(p, false);
        },
      },
      duration: 7000,
    });
  };

  const requestComplete = (p: Phase) => {
    const open = tasks.filter((t) => t.phase_id === p.id && !t.archived_at && t.status !== "done").length;
    if (open > 0) setConfirming({ phase: p, open });
    else complete(p);
  };

  if (retiredOn) {
    return (
      <>
        <PageHeader title="Phases" search={false} />
        <PageBody>
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <Flag className="shrink-0 text-muted" aria-hidden />
            <p className="min-w-0 flex-1 text-sm">
              The transition phases were retired on {fmt(retiredOn, "MMMM d, yyyy")}. You can bring them back in
              Settings.
            </p>
            <Button onClick={openSettings}>Open Settings</Button>
          </Card>
        </PageBody>
      </>
    );
  }

  return (
    <OpenTaskProvider>
      <PageHeader
        title="Phases"
        sub="Every task and deliverable in the 30-day transition plan"
        search={false}
        actions={
          <div className="flex flex-wrap gap-x-4">
            <Checkbox
              label={`Show completed phases (${completedCount})`}
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
            />
            <Checkbox
              label="Show archived tasks"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
          </div>
        }
      />
      <PageBody>
        {phasesQ.isLoading || tasksQ.isLoading ? (
          <Skeleton className="h-64" />
        ) : phasesQ.error || tasksQ.error ? (
          <Card>
            <ErrorState
              message={(phasesQ.error ?? tasksQ.error)?.message}
              onRetry={() => {
                void phasesQ.refetch();
                void tasksQ.refetch();
              }}
            />
          </Card>
        ) : phases.length === 0 ? (
          <Card>
            <p className="p-6 text-sm text-muted">No phases yet. They are created when your account is set up.</p>
          </Card>
        ) : (
          <>
            {allDone && leaving.size === 0 && (
              <Card className="flex flex-wrap items-center gap-4 p-5">
                <PartyPopper className="shrink-0 text-green-text" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">All {phases.length} phases are complete</p>
                  <p className="text-sm text-muted">
                    You can retire them: the Phases tab and phase cards go away and the app becomes a task tracker.
                    You&apos;ll see exactly what&apos;s removed before anything changes.
                  </p>
                </div>
                <Button variant="primary" onClick={() => setRetireOpen(true)}>
                  Review and retire phases
                </Button>
              </Card>
            )}

            {visible.map((p) => {
              const all = tasks.filter((t) => t.phase_id === p.id);
              const shown = all.filter((t) => showArchived || !t.archived_at);
              const live = all.filter((t) => !t.archived_at);
              const done = isPhaseComplete(p);
              return (
                <div key={p.id} className="leave-collapse" data-leaving={leaving.has(p.id)}>
                  <div>
                    <PhaseSection
                      phase={p}
                      tasks={[...shown].sort((a, b) => a.sort_order - b.sort_order)}
                      done={live.filter((t) => t.status === "done").length}
                      total={live.length}
                      isActive={current?.id === p.id}
                      defaultOpen={!done}
                      emptyText="No tasks in this phase."
                      headerExtra={
                        done ? (
                          <Button size="sm" variant="secondary" onClick={() => setSubmitted(p, false)}>
                            <RotateCcw size={14} aria-hidden /> Reopen
                          </Button>
                        ) : (
                          <Button size="sm" variant="primary" onClick={() => requestComplete(p)}>
                            <CheckCircle2 size={16} aria-hidden /> Mark phase complete
                          </Button>
                        )
                      }
                      footer={done ? undefined : <AddPhaseTask phase={p} />}
                    />
                  </div>
                </div>
              );
            })}
          </>
        )}
      </PageBody>

      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={confirming ? `Complete Phase ${confirming.phase.number}?` : "Complete phase?"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)}>
              Not yet
            </Button>
            <Button variant="primary" onClick={() => confirming && complete(confirming.phase)}>
              Complete anyway
            </Button>
          </>
        }
      >
        {confirming && (
          <p className="text-sm">
            {confirming.open} {confirming.open === 1 ? "task is" : "tasks are"} still open in{" "}
            <strong>{confirming.phase.name}</strong>. Completing the phase records the deliverable as submitted and
            archives the phase, with its tasks: they leave this page, Today and the Calendar. Nothing is deleted, and
            reopening the phase from <em>Show completed phases</em> brings them back.
          </p>
        )}
      </Modal>
      <RetirePhasesModal open={retireOpen} onClose={() => setRetireOpen(false)} />
    </OpenTaskProvider>
  );
}

function AddPhaseTask({ phase }: { phase: Phase }) {
  const id = useId();
  const create = useCreateTask();
  const tasks = useTasks().data ?? [];
  const [title, setTitle] = useState("");
  return (
    <form
      className="flex gap-2 border-t border-line py-3"
      onSubmit={(e) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        const maxSort = Math.max(0, ...tasks.filter((x) => x.phase_id === phase.id).map((x) => x.sort_order));
        create.mutate({ title: t.slice(0, 300), phase_id: phase.id, due_date: phase.end_date, sort_order: maxSort + 10 });
        setTitle("");
      }}
    >
      <label htmlFor={`${id}-t`} className="sr-only">
        Add a task to phase {phase.number}
      </label>
      <Input id={`${id}-t`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task to this phase" />
      <Button type="submit" className="shrink-0">
        <Plus size={16} aria-hidden /> Add
      </Button>
    </form>
  );
}
