import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Completes magic-link, confirm-signup and invite sign-in: verify the token, set the cookie, go home. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only allow same-site relative redirects.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  let reason = "missing_token";
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    reason = error.code ?? "unknown";
  } else if (code) {
    // Emails still on Supabase's default template link to Supabase first, which then
    // sends us here with ?code=. That works in the browser the link was requested from
    // (it holds the matching PKCE verifier cookie).
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    reason = error.code ?? "unknown";
  }

  const failed = new URL("/login", request.url);
  failed.searchParams.set("error", "link");
  // Supabase's error code (e.g. otp_expired), shown on the login page to explain the failure.
  if (/^[a-z_]{1,40}$/.test(reason)) failed.searchParams.set("reason", reason);
  return NextResponse.redirect(failed);
}
