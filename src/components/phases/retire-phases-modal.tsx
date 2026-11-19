"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { allPhasesComplete } from "@/lib/dates";
import { usePhases, useUpdateProfile } from "@/lib/queries/misc";
import { Modal } from "../ui/modal";
import { Button, Checkbox } from "../ui/primitives";
import { useToast } from "../ui/toast";

/** Everything retiring the phases hides. Keep in step with the code paths gated on usePhasesRetired(). */
export const RETIRE_REMOVES: { what: string; note?: string }[] = [
  { what: "The Phases tab in the sidebar" },
  { what: "The Transition progress card on the Dashboard", note: "Project progress takes its place." },
  {
    what: "The active phase card on the Dashboard",
    note: "Today's plan takes its place: what's planned or due today.",
  },
  { what: "The “Days left in phase” card on the Dashboard", note: "“Due this week” takes its place." },
  { what: "The “Transition period over” banner and “Day X of 30” next to the date" },
  { what: "Phase groups on Today" },
  { what: "Phase starts and deliverable due dates in the Schedule and Calendar" },
  {
    what: "The Transition status section in new weekly reports",
    note: "Reports you've already saved keep theirs.",
  },
];

export function RetirePhasesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const phases = usePhases().data ?? [];
  const update = useUpdateProfile();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [confirmed, setConfirmed] = useState(false);
  const ready = allPhasesComplete(phases);

  const close = () => {
    setConfirmed(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Retire the transition phases?"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Keep phases
          </Button>
          <Button
            variant="primary"
            disabled={!confirmed || !ready || update.isPending}
            onClick={() =>
              update.mutate(
                { phases_retired_at: new Date().toISOString() },
                {
                  onSuccess: () => {
                    close();
                    toast({
                      tone: "success",
                      message: "Phases retired. Bring them back any time from Settings.",
                      duration: 7000,
                    });
                    if (pathname === "/phases") router.replace("/");
                  },
                },
              )
            }
          >
            Retire phases
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 text-sm">
        <p>
          All {phases.length} phases are complete. Retiring them turns the app into a plain task tracker. This is
          what it removes:
        </p>
        <ul className="flex flex-col gap-2">
          {RETIRE_REMOVES.map((r) => (
            <li key={r.what} className="flex gap-3">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange" />
              <span>
                <span className="font-semibold">{r.what}</span>
                {r.note && <span className="text-muted"> · {r.note}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="rounded-xl bg-green-soft p-3 text-green-text">
          <strong>Nothing is deleted.</strong> Phases, their tasks and your saved reports stay in your data and in
          Export my data. Settings › Transition phases › Bring the phases back undoes this.
        </p>
        {!ready && <p className="font-semibold text-orange-text">Not every phase is complete yet.</p>}
        <Checkbox
          label="I've read the list above and want to retire the phases"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
      </div>
    </Modal>
  );
}
