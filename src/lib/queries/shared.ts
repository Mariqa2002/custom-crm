"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";

/** Apply an optimistic change to a cached list; returns a rollback function. */
export function patchList<T>(
  qc: QueryClient,
  key: QueryKey,
  updater: (list: T[]) => T[],
): () => void {
  const prev = qc.getQueryData<T[]>(key);
  qc.setQueryData<T[]>(key, (old) => updater(old ?? []));
  return () => qc.setQueryData(key, prev);
}

export function errMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong";
}

export function tempId() {
  return `temp-${crypto.randomUUID()}`;
}

export function isTemp(id: string) {
  return id.startsWith("temp-");
}

/** Throw on a Supabase error so TanStack Query treats it as a failure. */
export function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  if (res.data === null || res.data === undefined) throw new Error("No data returned");
  return res.data as NonNullable<T>;
}

/** Like check, but a missing row (maybeSingle) is allowed. */
export function checkMaybe<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
