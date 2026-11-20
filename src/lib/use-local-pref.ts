"use client";

import { useCallback, useSyncExternalStore } from "react";

// Device-only UI preferences (sidebar collapsed, Schedule view) live in
// localStorage. Every access is wrapped: storage can be blocked or empty.

const EVENT = "tt-local-pref";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function useLocalPref<T extends string>(key: string, fallback: T | null = null) {
  const value = useSyncExternalStore(
    (cb) => {
      const onStorage = (e: Event) => {
        if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent).detail === key) cb();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(EVENT, onStorage);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(EVENT, onStorage);
      };
    },
    () => read(key),
    () => null,
  );

  const set = useCallback(
    (next: T | null) => {
      try {
        if (next === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, next);
      } catch {
        /* ignore: preference just won't persist */
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );

  return [((value as T | null) ?? fallback) as T | null, set] as const;
}

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
