"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

export type TypedClient = SupabaseClient<Database>;

let browserClient: TypedClient | undefined;

/** Browser client for client components (singleton; cookies hold the session). */
export function createClient(): TypedClient {
  if (!browserClient) {
    assertSupabaseEnv();
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return browserClient;
}
