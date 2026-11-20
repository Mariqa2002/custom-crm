"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({ email: z.email("Enter a valid email address") });

export function LoginForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }: { email: string }) => {
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // only the invited account can sign in
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    // Don't reveal whether an account exists: treat "not allowed" like success.
    if (error && !/signups not allowed|not found|otp_disabled/i.test(error.message)) {
      setError(error.message);
      return;
    }
    setSentTo(email);
  };

  if (sentTo) {
    return (
      <div role="status" className="mt-6 flex gap-3 rounded-xl bg-accent-soft p-4 text-sm">
        <MailCheck className="shrink-0 text-accent-text" aria-hidden />
        <div>
          <p className="font-bold">Check your email</p>
          <p className="mt-1 text-muted">
            If <strong className="text-text">{sentTo}</strong> has access, a sign-in link is on its
            way. You can close this tab.
          </p>
          <button
            type="button"
            className="mt-2 min-h-11 font-semibold text-accent-text underline"
            onClick={() => setSentTo(null)}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message ?? error ?? undefined}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          {...form.register("email")}
        />
      </Field>
      <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
