import type { Metadata } from "next";
import { SetupNotice } from "@/components/setup-notice";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return <SetupNotice />;
  const { error } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8">
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-xl bg-accent text-base font-extrabold text-on-accent"
        >
          TT
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">Transition Tracker</h1>
        <p className="mt-1 text-sm text-muted">
          Web Developer · e-Government Unit. Enter your email and we&apos;ll send you a sign-in
          link.
        </p>
        {error === "link" && (
          <p role="alert" className="mt-4 rounded-xl bg-orange-soft p-3 text-sm font-semibold text-orange-text">
            That sign-in link has expired or was already used. Request a new one.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
