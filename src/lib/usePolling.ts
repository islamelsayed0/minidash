"use client";

import { useEffect, useRef, useState } from "react";

interface PollState<T> {
  data: T | null;
  error: string | null;
  updatedAt: Date | null;
  loading: boolean;
}

export function usePolling<T>(url: string, intervalMs: number): PollState<T> {
  const [state, setState] = useState<PollState<T>>({
    data: null,
    error: null,
    updatedAt: null,
    loading: true,
  });
  const urlRef = useRef(url);
  urlRef.current = url;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch(urlRef.current, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = (await res.json()) as T;
        if (!cancelled) {
          setState({ data, error: null, updatedAt: new Date(), loading: false });
        }
      } catch (e) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            error: e instanceof Error ? e.message : "fetch failed",
            loading: false,
          }));
        }
      } finally {
        if (!cancelled) timer = setTimeout(tick, intervalMs);
      }
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [url, intervalMs]);

  return state;
}
