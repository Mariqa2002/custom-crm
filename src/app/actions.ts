"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { ThemePref } from "@/lib/types";

/** Clears the Supabase session cookie. The client clears its query cache. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/** Mirrors the theme choice into a cookie so the server renders it with no flash. */
export async function setThemeCookie(theme: ThemePref) {
  const store = await cookies();
  if (theme === "system") store.delete("theme");
  else
    store.set("theme", theme, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
    });
}
