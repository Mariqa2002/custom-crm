import type { Metadata } from "next";
import { SetupNotice } from "@/components/setup-notice";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Why a sign-in link failed, keyed by Supabase's error code (see /auth/confirm). */
const LINK_ERRORS: Record<string, string> = {
  pkce_code_verifier_not_found:
    "Open the sign-in link in the same browser you requested it from, or request a new one here.",
  flow_state_not_found:
    "Open the sign-in link in the same browser you requested it from, or request a new one here.",
  bad_code_verifier:
    "Open the sign-in link in the same browser you requested it from, or request a new one here.",
  otp_expired:
    "That sign-in link has expired or was already used. Links work once, for one hour, and only the newest link you requested is valid. Request a new one.",
  missing_token:
    "That link is missing its sign-in code. In Supabase, check the Magic Link, Confirm signup and Invite user email templates use the token_hash link from the README, then request a new link.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return <SetupNotice />;
  const { error, reason } = await searchParams;
  const code = typeof reason === "string" ? reason : "";

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
          Web Developer · e-Government Unit. Sign in with your email and password.
        </p>
        {error === "link" && (
          <p role="alert" className="mt-4 rounded-xl bg-orange-soft p-3 text-sm font-semibold text-orange-text">
            {LINK_ERRORS[code] ??
              `That sign-in link didn't work${code ? ` (${code})` : ""}. Request a new one.`}
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
