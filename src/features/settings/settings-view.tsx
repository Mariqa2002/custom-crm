"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, Flag, LogOut, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { signOut } from "@/app/actions";
import { RetirePhasesModal } from "@/components/phases/retire-phases-modal";
import { PageHeader } from "@/components/shell/page-header";
import { PageBody } from "@/components/shell/page-layout";
import { useTheme } from "@/components/theme";
import { useToast } from "@/components/ui/toast";
import { Button, Card, Field, IconButton, Input, Select } from "@/components/ui/primitives";
import { WEEKDAYS } from "@/lib/constants";
import { allPhasesComplete, dateOfTimestamp, fmt, fmtRange, isPhaseComplete, todayISO } from "@/lib/dates";
import {
  useCreateResponsibility,
  useDeleteResponsibility,
  usePhases,
  useProfile,
  useResponsibilities,
  useUpdateProfile,
  useUpdateResponsibility,
} from "@/lib/queries/misc";
import { errMessage } from "@/lib/queries/shared";
import { createClient } from "@/lib/supabase/client";
import type { Responsibility, ThemePref } from "@/lib/types";

const TABLES = ["profiles", "phases", "projects", "tasks", "updates", "events", "responsibilities", "reports"] as const;

/** The /settings route (kept for direct links). The sidebar opens the same panel in a modal. */
export function SettingsView() {
  return (
    <>
      <PageHeader title="Settings" search={false} />
      <PageBody>
        <Card className="px-5 py-2">
          <SettingsPanel />
        </Card>
      </PageBody>
    </>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-b border-line py-5 last:border-b-0">
      <h3 id={id} className="text-[15px] font-bold">
        {title}
      </h3>
      {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPanel({ onSignedOut }: { onSignedOut?: () => void }) {
  const id = useId();
  const profile = useProfile().data;
  const update = useUpdateProfile();
  const { pref, applyTheme } = useTheme();
  const { toast } = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const exportData = async () => {
    setExporting(true);
    try {
      const sb = createClient();
      const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
      for (const t of TABLES) {
        const { data, error } = await sb.from(t).select("*");
        if (error) throw new Error(`${t}: ${error.message}`);
        out[t] = data;
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transition-tracker-export_${todayISO()}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      toast({ tone: "error", message: `Export failed: ${errMessage(e)}` });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <Section title="Profile" sub="Used in the greeting and on your weekly reports">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate(
              {
                full_name: (name ?? profile?.full_name ?? "").trim().slice(0, 200),
                job_title: (title ?? profile?.job_title ?? "Web Developer").trim().slice(0, 200) || "Web Developer",
              },
              { onSuccess: () => toast({ tone: "success", message: "Profile saved", duration: 2500 }) },
            );
          }}
        >
          <Field label="Full name" htmlFor={`${id}-n`}>
            <Input
              id={`${id}-n`}
              value={name ?? profile?.full_name ?? ""}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mariqa J. Cumberbatch"
            />
          </Field>
          <Field label="Job title" htmlFor={`${id}-t`}>
            <Input id={`${id}-t`} value={title ?? profile?.job_title ?? ""} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary">
              Save profile
            </Button>
          </div>
        </form>
      </Section>

      <Section
        title="Ongoing responsibilities"
        sub="Shown on the Dashboard. Edit a line and press Enter (or click away) to save."
      >
        <ResponsibilitiesEditor />
      </Section>

      <Section title="Password" sub="Used to sign in on all your devices. At least 8 characters.">
        <PasswordForm />
      </Section>

      <Section title="Weekly report and appearance">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Weekly report day"
            htmlFor={`${id}-d`}
            hint="The Dashboard reminds you on this day until the week's report is marked sent."
          >
            <Select
              id={`${id}-d`}
              value={profile?.weekly_report_day ?? 5}
              onChange={(e) => update.mutate({ weekly_report_day: Number(e.target.value) })}
            >
              {WEEKDAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Theme" htmlFor={`${id}-theme`}>
            <Select
              id={`${id}-theme`}
              value={pref}
              onChange={(e) => {
                const next = e.target.value as ThemePref;
                applyTheme(next);
                update.mutate({ theme: next });
              }}
            >
              <option value="system">Match my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Transition phases">
        <PhasesSettings />
      </Section>

      <Section title="Your data" sub="Download everything you own as one JSON file">
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportData} disabled={exporting}>
            <Download size={16} aria-hidden /> {exporting ? "Preparing…" : "Export my data"}
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              onSignedOut?.();
              qc.clear();
              router.replace("/login");
              router.refresh();
            }}
          >
            <LogOut size={16} aria-hidden /> Sign out
          </Button>
        </div>
      </Section>
    </div>
  );
}

function PasswordForm() {
  const id = useId();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (password.length < 8) return setError("Use at least 8 characters.");
        if (password !== confirm) return setError("The two passwords don't match.");
        setError(null);
        setSaving(true);
        const { error } = await createClient().auth.updateUser({ password });
        setSaving(false);
        if (error) return setError(error.message);
        setPassword("");
        setConfirm("");
        toast({ tone: "success", message: "Password saved. Use it to sign in on your other devices." });
      }}
    >
      {/* Lets password managers attach the new password to the right account. */}
      <input type="email" name="username" autoComplete="username" value={useProfileEmail()} readOnly hidden />
      <Field label="New password" htmlFor={`${id}-p`}>
        <Input
          id={`${id}-p`}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Field label="Type it again" htmlFor={`${id}-c`} error={error ?? undefined}>
        <Input
          id={`${id}-c`}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save password"}
        </Button>
      </div>
    </form>
  );
}

/** The signed-in email, for the password manager hint above. */
function useProfileEmail() {
  const [email, setEmail] = useState("");
  useEffect(() => {
    let live = true;
    void createClient()
      .auth.getUser()
      .then(({ data }) => live && setEmail(data.user?.email ?? ""));
    return () => {
      live = false;
    };
  }, []);
  return email;
}

function PhasesSettings() {
  const profile = useProfile().data;
  const phases = usePhases().data ?? [];
  const update = useUpdateProfile();
  const { toast } = useToast();
  const [retireOpen, setRetireOpen] = useState(false);
  const retiredOn = dateOfTimestamp(profile?.phases_retired_at);
  const done = phases.filter(isPhaseComplete).length;

  if (retiredOn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-sm text-muted">
          Retired on {fmt(retiredOn, "MMMM d, yyyy")}. The app is running as a task tracker. Your phases and their
          tasks are still saved.
        </p>
        <Button
          onClick={() =>
            update.mutate(
              { phases_retired_at: null },
              { onSuccess: () => toast({ tone: "success", message: "Phases are back on the Dashboard and in the sidebar." }) },
            )
          }
        >
          <Flag size={16} aria-hidden /> Bring the phases back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1 text-sm text-muted">
        {done} of {phases.length} phases complete
        {profile && ` · ${fmtRange(profile.transition_start, profile.transition_end)}`}.{" "}
        {allPhasesComplete(phases)
          ? "Every phase is complete, so you can retire them and use the app as a task tracker."
          : "Once every phase is complete you can retire them here."}
      </p>
      <Button disabled={!allPhasesComplete(phases)} onClick={() => setRetireOpen(true)}>
        Review and retire phases
      </Button>
      <RetirePhasesModal open={retireOpen} onClose={() => setRetireOpen(false)} />
    </div>
  );
}

function ResponsibilitiesEditor() {
  const id = useId();
  const q = useResponsibilities();
  const items = q.data ?? [];
  const create = useCreateResponsibility();
  const update = useUpdateResponsibility();
  const del = useDeleteResponsibility();
  const [draft, setDraft] = useState("");

  const swap = (a: Responsibility, b: Responsibility) => {
    update.mutate({ id: a.id, patch: { sort_order: b.sort_order } });
    update.mutate({ id: b.id, patch: { sort_order: a.sort_order } });
  };

  return (
    <div>
      {items.length === 0 && !q.isLoading && <p className="pb-3 text-sm text-muted">No responsibilities yet.</p>}
      <ol className="flex flex-col gap-2">
        {items.map((r, i) => (
          <li key={r.id} className="flex items-center gap-1">
            <ResponsibilityInput
              item={r}
              index={i}
              onSave={(body) => update.mutate({ id: r.id, patch: { body } })}
            />
            <IconButton label={`Move "${r.body}" up`} disabled={i === 0} onClick={() => swap(r, items[i - 1])}>
              <ArrowUp size={16} aria-hidden />
            </IconButton>
            <IconButton
              label={`Move "${r.body}" down`}
              disabled={i === items.length - 1}
              onClick={() => swap(r, items[i + 1])}
            >
              <ArrowDown size={16} aria-hidden />
            </IconButton>
            <IconButton label={`Delete "${r.body}"`} onClick={() => del.mutate(r.id)}>
              <Trash2 size={16} aria-hidden />
            </IconButton>
          </li>
        ))}
      </ol>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body) return;
          const max = Math.max(0, ...items.map((r) => r.sort_order));
          create.mutate({ body: body.slice(0, 500), sort_order: max + 10 });
          setDraft("");
        }}
      >
        <label htmlFor={`${id}-new`} className="sr-only">
          New responsibility
        </label>
        <Input
          id={`${id}-new`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a responsibility"
        />
        <Button type="submit" className="shrink-0">
          <Plus size={16} aria-hidden /> Add
        </Button>
      </form>
    </div>
  );
}

/** Edits in place; saves on Enter or blur, Esc puts the old text back. */
function ResponsibilityInput({
  item,
  index,
  onSave,
}: {
  item: Responsibility;
  index: number;
  onSave: (body: string) => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  const shown = value ?? item.body;
  const commit = () => {
    const body = shown.trim();
    if (body && body !== item.body) onSave(body.slice(0, 500));
    setValue(null);
  };
  return (
    <Input
      aria-label={`Responsibility ${index + 1}`}
      value={shown}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape" && value !== null) {
          e.preventDefault(); // keep the settings dialog open
          setValue(null);
        }
      }}
    />
  );
}
