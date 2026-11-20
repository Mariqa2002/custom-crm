"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const errors = form.formState.errors;

  const onSubmit = async ({ email, password }: z.infer<typeof schema>) => {
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      // Same message whether the email or the password is wrong.
      setError(
        /invalid login credentials/i.test(error.message)
          ? "That email and password don't match. Try again."
          : error.message,
      );
      return;
    }
    router.replace("/");
    router.refresh(); // let the server layout pick up the new session cookie
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4" noValidate>
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          {...form.register("email")}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
      </Field>
      {error && (
        <p role="alert" className="rounded-xl bg-orange-soft p-3 text-sm font-semibold text-orange-text">
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
